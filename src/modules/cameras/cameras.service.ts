import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { env } from "../../config/env.js";
import {
  camerasTable,
  type CameraType,
} from "../../db/schema/cameras.schema.js";
import { decryptSecret, encryptSecret } from "../../lib/encryption.js";
import { AppError } from "../../utils/AppError.js";
import { maskUrlPassword } from "../../utils/maskUrlPassword.js";
import {
  buildPaginationMeta,
  getOffset,
  type PaginatedResultType,
} from "../../utils/pagination.js";
import type {
  CreateCameraSchemaType,
  ListCamerasQuerySchemaType,
  UpdateCameraSchemaType,
} from "./cameras.validation.js";
import { escapeLikePattern } from "../../utils/sql.js";
import { db } from "../../db/index.js";
import { isUniqueViolation } from "../../utils/dbErrors.js";
import { logger } from "../../lib/logger.js";
import {
  mediamtxDeletePath,
  MediaMtxError,
  mediamtxUpsertPath,
  type MediaMtxPathConfigType,
} from "../../lib/mediamtxClient.js";

const STREAM_PATH_UNIQUE_CONSTRAINT = "cameras_stream_path_unique";

// What the API returns: the encrypted column is replaced by a masked URL and a playback URL
export type PublicCameraType = Omit<CameraType, "rtspUrlEncrypted"> & {
  rtspUrlMasked: string;
  hlsUrl: string;
};

function cameraNotFound(): AppError {
  return new AppError(404, "Camera not found", "CAMERA_NOT_FOUND");
}

function streamPathTaken(streamPath: string): AppError {
  return new AppError(
    409,
    `A camera with streamPath "${streamPath}" already exists`,
    "CAMERA_STREAM_PATH_EXISTS",
  );
}

function assertStreamPathAllowed(streamPath: string): void {
  if (env.surveillance.reservedPaths.includes(streamPath)) {
    throw new AppError(
      409,
      `streamPath "${streamPath}" is reserved by the media server`,
      "CAMERA_STREAM_PATH_RESERVED",
    );
  }
}

// ── MediaMTX sync ──
// Postgres is the source of truth. Every write runs inside a transaction and calls
// MediaMTX before committing: if MediaMTX refuses, the database change is rolled back.

// How MediaMTX should pull a camera's video
function buildPathConfig(rtspUrl: string): MediaMtxPathConfigType {
  return {
    source: rtspUrl,
    // Connect to the camera only while someone watches (saves camera and network load)
    sourceOnDemand: true,
    rtspTransport: "tcp",
  };
}

// Runs a MediaMTX call; a media server failure becomes a 502 and rolls back the transaction
async function withMediaServer(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof MediaMtxError) {
      logger.error({ err: error }, "MediaMTX sync failed");
      throw new AppError(
        502,
        "The media server is unavailable, so no changes were saved. Try again later.",
        "MEDIA_SERVER_UNAVAILABLE",
      );
    }
    throw error;
  }
}

// The single place that turns a DB row into an API object, so the secret column can never leak
function toPublicCamera(camera: CameraType): PublicCameraType {
  const { rtspUrlEncrypted, ...rest } = camera;

  return {
    ...rest,
    rtspUrlMasked: maskUrlPassword(decryptSecret(rtspUrlEncrypted)),
    hlsUrl: new URL(
      `${camera.streamPath}/index.m3u8`,
      `${env.surveillance.hlsBaseUrl}/`,
    ).toString(),
  };
}

// GET /admin/cameras
export async function cameraListService(
  query: ListCamerasQuerySchemaType,
): Promise<PaginatedResultType<PublicCameraType>> {
  const conditions: Array<SQL> = [];
  if (query.search) {
    const pattern = `%${escapeLikePattern(query.search)}%`;
    const searchCondition = or(
      ilike(camerasTable.name, pattern),
      ilike(camerasTable.location, pattern),
      ilike(camerasTable.streamPath, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  if (query.isActive !== undefined) {
    conditions.push(eq(camerasTable.isActive, query.isActive));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(camerasTable)
      .where(where)
      // Newest first; id breaks ties so pages never repeat or skip a row
      .orderBy(desc(camerasTable.createdAt), desc(camerasTable.id))
      .limit(query.limit)
      .offset(getOffset(query)),
    db.select({ total: count() }).from(camerasTable).where(where),
  ]);

  return {
    items: rows.map(toPublicCamera),
    meta: buildPaginationMeta(query, totalRow?.total ?? 0),
  };
}

// GET /admin/cameras/:id
export async function cameraGetByIdService(
  id: string,
): Promise<PublicCameraType> {
  const [camera] = await db
    .select()
    .from(camerasTable)
    .where(eq(camerasTable.id, id))
    .limit(1);

  if (!camera) throw cameraNotFound();
  return toPublicCamera(camera);
}

// POST /admin/cameras
export async function cameraCreateService(
  input: CreateCameraSchemaType,
): Promise<PublicCameraType> {
  assertStreamPathAllowed(input.streamPath);

  try {
    const camera = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(camerasTable)
        .values({
          name: input.name,
          location: input.location,
          rtspUrlEncrypted: encryptSecret(input.rtspUrl),
          streamPath: input.streamPath,
          isActive: input.isActive ?? true,
        })
        .returning();

      if (!created) throw new Error("Insert did not return the created camera");

      // Only active cameras get a MediaMTX path
      if (created.isActive) {
        await withMediaServer(() =>
          mediamtxUpsertPath(
            created.streamPath,
            buildPathConfig(input.rtspUrl),
          ),
        );
      }

      return created;
    });

    return toPublicCamera(camera);
  } catch (error) {
    // The unique index, not a SELECT before INSERT, decides: no race between two requests
    if (isUniqueViolation(error, STREAM_PATH_UNIQUE_CONSTRAINT)) {
      throw streamPathTaken(input.streamPath);
    }
    throw error;
  }
}

// PATCH /admin/cameras/:id
export async function cameraUpdateService(
  id: string,
  input: UpdateCameraSchemaType,
): Promise<PublicCameraType> {
  if (input.streamPath !== undefined) assertStreamPathAllowed(input.streamPath);
  // Renaming a camera or changing its location does not concern MediaMTX
  const touchesStream =
    input.rtspUrl !== undefined ||
    input.streamPath !== undefined ||
    input.isActive !== undefined;

  try {
    const camera = await db.transaction(async (tx) => {
      // Lock the row so two concurrent updates cannot sync MediaMTX in the wrong order
      const [current] = await tx
        .select()
        .from(camerasTable)
        .where(eq(camerasTable.id, id))
        .for("update");

      if (!current) throw cameraNotFound();

      const [updated] = await tx
        .update(camerasTable)
        .set({
          // undefined fields are skipped by Drizzle; location: null clears it
          name: input.name,
          location: input.location,
          rtspUrlEncrypted:
            input.rtspUrl !== undefined
              ? encryptSecret(input.rtspUrl)
              : undefined,
          streamPath: input.streamPath,
          isActive: input.isActive,
        })
        .where(eq(camerasTable.id, id))
        .returning();

      if (!updated) throw cameraNotFound();

      if (touchesStream) {
        await withMediaServer(async () => {
          if (updated.isActive) {
            const rtspUrl =
              input.rtspUrl ?? decryptSecret(updated.rtspUrlEncrypted);
            await mediamtxUpsertPath(
              updated.streamPath,
              buildPathConfig(rtspUrl),
            );
          }

          // The old path must go when the camera is disabled or moved to a new streamPath
          const oldPathIsStale =
            !updated.isActive || updated.streamPath !== current.streamPath;
          if (oldPathIsStale) await mediamtxDeletePath(current.streamPath);
        });
      }

      return updated;
    });

    return toPublicCamera(camera);
  } catch (error) {
    if (
      input.streamPath &&
      isUniqueViolation(error, STREAM_PATH_UNIQUE_CONSTRAINT)
    ) {
      throw streamPathTaken(input.streamPath);
    }
    throw error;
  }
}

// DELETE /admin/cameras/:id
export async function cameraDeleteService(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(camerasTable)
      .where(eq(camerasTable.id, id))
      .returning({ streamPath: camerasTable.streamPath });

    if (!deleted) throw cameraNotFound();

    // Deleting a path that is already gone is fine (inactive cameras have none)
    await withMediaServer(() => mediamtxDeletePath(deleted.streamPath));
  });
}
