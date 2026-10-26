import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

const FORMAT_VERSION = "v1";

const encryptionKey = Buffer.from(env.security.dataEncryptionKey, "base64");

// Returns "v1:<iv>:<authTag>:<cipherText>", each part base64url-encoded
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });

  const cipherText = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    cipherText.toString("base64url"),
  ].join(":");
}

// Throws if the payload was modified or encrypted with a different key (auth tag mismatch)
export function decryptSecret(payload: string): string {
  const [version, ivPart, authTagPart, cipherTextPart] = payload.split(":");

  if (
    version !== FORMAT_VERSION ||
    !ivPart ||
    !authTagPart ||
    cipherTextPart === undefined
  ) {
    throw new Error("Unsupported encrypted payload format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(ivPart, "base64url"),
    { authTagLength: AUTH_TAG_BYTES },
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(cipherTextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
