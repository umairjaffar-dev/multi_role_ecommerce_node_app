import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { FileStorageType } from "./storage.types.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Signed image URLs stay valid for one hour
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

export type S3StorageConfigType = {
  endpoint: string | undefined;
  forcePathStyle: boolean;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | undefined;
};

// Works with AWS S3 and any S3-compatible service; only the config changes.
export function createS3Storage(config: S3StorageConfigType): FileStorageType {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const publicBaseUrl = config.publicBaseUrl?.replace(/\/+$/, "");

  return {
    async upload({ key, body, contentType }) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Keys are never reused (random uuid), so browsers and CDNs may cache forever
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },

    async delete(key) {
      // S3 treats deleting a missing key as success, so this is idempotent
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },

    async getUrl(key) {
      if (publicBaseUrl) return `${publicBaseUrl}/${key}`;

      // The bucket stays private; this link proves the server allowed the read
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS },
      );
    },

    async checkConnection() {
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    },
  };
}
