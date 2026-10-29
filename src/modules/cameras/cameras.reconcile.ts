import { eq } from "drizzle-orm";
import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { camerasTable } from "../../db/schema/index.js";
import { decryptSecret } from "../../lib/encryption.js";
import { logger } from "../../lib/logger.js";
import {
  MediaMtxError,
  mediamtxDeletePath,
  mediamtxListPathNames,
  mediamtxUpsertPath,
} from "../../lib/mediamtxClient.js";
import { buildPathConfig, lockCameraPathSync } from "./cameras.service.js";

// Reconciliation: make MediaMTX match the database (desired state → actual state).
// MediaMTX keeps API-created paths only in memory, so after a restart they are gone.
// This job re-creates every active camera's path and removes paths nobody owns.

export type ReconcileSummaryType = {
  upserted: number;
  deleted: number;
  failed: number;
};

export async function cameraPathsReconcileService(): Promise<ReconcileSummaryType> {
  return db.transaction(async (tx) => {
    // Waits for in-flight camera writes, and blocks new ones until this run ends
    await lockCameraPathSync(tx);

    const activeCameras = await tx
      .select({
        streamPath: camerasTable.streamPath,
        rtspUrlEncrypted: camerasTable.rtspUrlEncrypted,
      })
      .from(camerasTable)
      .where(eq(camerasTable.isActive, true));

    // Throws MediaMtxError if MediaMTX is down; the caller decides how loud to be
    const existingPaths = await mediamtxListPathNames();

    const wantedPaths = new Set(
      activeCameras.map((camera) => camera.streamPath),
    );
    const reservedPaths = new Set(env.surveillance.reservedPaths);
    const summary: ReconcileSummaryType = {
      upserted: 0,
      deleted: 0,
      failed: 0,
    };

    // 1. Every active camera must have its path. Re-applying an unchanged config is a
    //    no-op in MediaMTX, so viewers of already-correct paths are not interrupted.
    for (const camera of activeCameras) {
      try {
        await mediamtxUpsertPath(
          camera.streamPath,
          buildPathConfig(decryptSecret(camera.rtspUrlEncrypted)),
        );
        summary.upserted += 1;
      } catch (error) {
        // One broken camera must not stop the others from being repaired
        summary.failed += 1;
        logger.error(
          { err: error, streamPath: camera.streamPath },
          "Reconcile: could not apply camera path",
        );
      }
    }

    // 2. Paths that no active camera owns are leftovers (deleted, disabled, half-synced).
    //    Reserved paths from mediamtx.yml are never touched.
    for (const name of existingPaths) {
      if (wantedPaths.has(name) || reservedPaths.has(name)) continue;
      try {
        await mediamtxDeletePath(name);
        summary.deleted += 1;
      } catch (error) {
        summary.failed += 1;
        logger.error(
          { err: error, streamPath: name },
          "Reconcile: could not remove orphan path",
        );
      }
    }

    return summary;
  });
}

let reconcileTimer: NodeJS.Timeout | null = null;
let isReconciling = false;
let lastRunFailed = false;

async function runReconcileOnce(): Promise<void> {
  // A slow run must not overlap with the next tick
  if (isReconciling) return;
  isReconciling = true;

  try {
    const summary = await cameraPathsReconcileService();
    if (summary.deleted > 0 || summary.failed > 0 || lastRunFailed) {
      logger.info(summary, "Camera paths reconciled with MediaMTX");
    } else {
      logger.debug(summary, "Camera paths already in sync with MediaMTX");
    }
    lastRunFailed = false;
  } catch (error) {
    // Surveillance is optional for the shop: warn once per outage instead of every tick
    if (!lastRunFailed) {
      const reason =
        error instanceof MediaMtxError ? error.message : "unexpected error";
      logger.warn(
        { err: error },
        `MediaMTX reconcile skipped (${reason}); retrying every ${env.surveillance.reconcileIntervalSeconds}s`,
      );
    }
    lastRunFailed = true;
  } finally {
    isReconciling = false;
  }
}

// Runs once now, then on an interval. Never throws: the shop works without MediaMTX.
export function startCameraPathsReconcileLoop(): void {
  const intervalSeconds = env.surveillance.reconcileIntervalSeconds;
  if (intervalSeconds === 0) {
    logger.info("MediaMTX reconcile is disabled (interval 0)");
    return;
  }

  void runReconcileOnce();
  reconcileTimer = setInterval(
    () => void runReconcileOnce(),
    intervalSeconds * 1000,
  );
  // Do not keep the process alive just for this timer
  reconcileTimer.unref();
}

export function stopCameraPathsReconcileLoop(): void {
  if (reconcileTimer) clearInterval(reconcileTimer);
  reconcileTimer = null;
}
