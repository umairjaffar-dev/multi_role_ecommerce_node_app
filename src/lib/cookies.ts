import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env.js";

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

const MS_PER_DAY = 24 * 60 * 60 * 1000; // Same Value that used in getRefreshTokenExpiryDate method.

const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read it (XSS protection)
  secure: env.isProduction, // HTTPS only in production; local development runs on http
  sameSite: "strict", // Not sent on requests started by other sites (CSRF protection)
  path: "/api/v1/auth", // Sent only to auth routes, not with every API request
};

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    ...refreshTokenCookieOptions,
    maxAge: env.refreshToken.ttlDays * MS_PER_DAY,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenCookieOptions);
}
