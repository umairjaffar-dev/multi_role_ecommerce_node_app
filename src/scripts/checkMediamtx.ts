import { randomUUID } from "node:crypto";
import {
  MediaMtxError,
  mediamtxDeletePath,
  mediamtxGetPathStatus,
  mediamtxListPathNames,
  mediamtxUpsertPath,
} from "../lib/mediamtxClient.js";

function describeMediaMtxError(err: unknown): string {
  if (err instanceof MediaMtxError) {
    if (err.status === null) {
      return "Cannot reach MEDIAMTX_API_URL: is the surveillance stack running? (npm run services:up)";
    }
    if (err.status === 401) {
      return "Authentication failed: MEDIAMTX_API_PASSWORD in .env must match surveillance/.env";
    }
  }
  return err instanceof Error ? err.message : String(err);
}

// End-to-end check of the MediaMTX API settings in .env: list → create → status → delete
async function checkMediamtx(): Promise<number> {
  const testPath = `healthcheck-${randomUUID().slice(0, 8)}`;

  const names = await mediamtxListPathNames();
  console.log(
    `✔ API reachable, ${names.length} paths configured: ${names.join(", ")}`,
  );

  await mediamtxUpsertPath(testPath, {
    source: "rtsp://localhost:8554/fake1",
    sourceOnDemand: true,
    rtspTransport: "tcp",
  });
  console.log(`✔ Created path ${testPath}`);

  // Upsert again on purpose: it must not fail when the path already exists
  await mediamtxUpsertPath(testPath, {
    source: "rtsp://localhost:8554/fake1",
    sourceOnDemand: true,
    rtspTransport: "tcp",
  });
  console.log("✔ Upsert is idempotent");

  const status = await mediamtxGetPathStatus(testPath);
  if (!status) {
    console.error("✘ Path not found right after creating it");
    return 1;
  }
  console.log(
    `✔ Status read: ready=${status.ready}, readers=${status.readerCount}`,
  );

  await mediamtxDeletePath(testPath);
  await mediamtxDeletePath(testPath);
  console.log("✔ Deleted the test path (twice, delete is idempotent)");

  const after = await mediamtxGetPathStatus(testPath);
  if (after !== null) {
    console.error("✘ Path still exists after delete");
    return 1;
  }

  console.log("MediaMTX API is ready.");
  return 0;
}

checkMediamtx()
  .then((exitCode) => process.exit(exitCode))
  .catch((err: unknown) => {
    console.error(`✘ MediaMTX check failed: ${describeMediaMtxError(err)}`);
    process.exit(1);
  });
