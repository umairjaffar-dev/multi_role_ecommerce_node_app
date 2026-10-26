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
  try {
    const [camera] = await db
      .insert(camerasTable)
      .values({
        name: input.name,
        location: input.location,
        rtspUrlEncrypted: encryptSecret(input.rtspUrl),
        streamPath: input.streamPath,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!camera) throw new Error("Insert did not return the created camera");
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
  try {
    const [camera] = await db
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

    if (!camera) throw cameraNotFound();
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
  const [deleted] = await db
    .delete(camerasTable)
    .where(eq(camerasTable.id, id))
    .returning({ id: camerasTable.id });

  if (!deleted) throw cameraNotFound();
}
