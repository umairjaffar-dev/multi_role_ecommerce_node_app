import { randomUUID } from "node:crypto";
import { storage } from "../lib/storage/index.js";

// S3 errors for HEAD requests have no body, so turn the details into a readable hint
type StorageErrorShapeType = {
  code?: string;
  cause?: { code?: string };
  $metadata?: { httpStatusCode?: number };
};

function describeStorageError(err: unknown): string {
  const { code, cause, $metadata } = (err ?? {}) as StorageErrorShapeType;
  const status = $metadata?.httpStatusCode;
  // Node.js network errors carry their code on the error itself or on its cause
  const networkCode = code ?? cause?.code;

  if (status === 404) {
    return "Bucket not found: check S3_BUCKET or create the bucket";
  }
  if (status === 403) {
    return "Access denied: check S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY";
  }
  if (networkCode === "ECONNREFUSED") {
    return "Cannot reach S3_ENDPOINT: is the storage container running?";
  }
  return err instanceof Error ? err.message : String(err);
}

// End-to-end check of the storage settings in .env: connect → upload → read back → delete
async function checkStorage(): Promise<number> {
  const key = `healthchecks/${randomUUID()}.txt`;
  const content = `storage check ${new Date().toISOString()}`;

  await storage.checkConnection();
  console.log("✔ Bucket reachable and credentials accepted");

  await storage.upload({
    key,
    body: Buffer.from(content),
    contentType: "text/plain",
  });
  console.log(`✔ Uploaded ${key}`);

  const url = await storage.getUrl(key);
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok || body !== content) {
    console.error(`✘ Read back failed: HTTP ${response.status}`);
    return 1;
  }
  console.log("✔ Read back through the generated URL");

  await storage.delete(key);
  console.log("✔ Deleted the test file");

  console.log("Storage is ready.");
  return 0;
}

checkStorage()
  .then((exitCode) => process.exit(exitCode))
  .catch((err: unknown) => {
    console.error(`✘ Storage check failed: ${describeStorageError(err)}`);
    process.exit(1);
  });
