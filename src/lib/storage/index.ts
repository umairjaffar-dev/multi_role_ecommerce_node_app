import { env } from "../../config/env.js";
import { createS3Storage } from "./s3Storage.js";

export const storage = createS3Storage(env.storage);

export type { FileStorageType, UploadFileInputType } from "./storage.types.js";
