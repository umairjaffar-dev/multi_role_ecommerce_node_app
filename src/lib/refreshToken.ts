import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const REFRESH_TOKEN_BYTES = 32;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiryDate(): Date {
  return new Date(Date.now() + env.refreshToken.ttlDays * MS_PER_DAY);
}
