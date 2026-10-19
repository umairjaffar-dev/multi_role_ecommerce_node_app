import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";
import { getRefreshTokenTtlMs } from "./refreshToken.js";

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read it (XSS protection)
  secure: env.isProduction, // HTTPS only in production; local development runs on http
  sameSite: "strict", // Not sent on requests started by other sites (CSRF protection)
  path: "/api/v1/auth", // Sent only to auth routes, not with every API request
};

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    ...refreshTokenCookieOptions,
    maxAge: getRefreshTokenTtlMs(),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenCookieOptions);
}
