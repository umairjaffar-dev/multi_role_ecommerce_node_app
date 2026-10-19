import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../lib/jwt.js";

const BEARER_SCHEME = "bearer";

// Auth scheme names are case-insensitive (RFC 7235): "Bearer", "bearer" and "BEARER" are all valid
function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== BEARER_SCHEME || !token || rest.length > 0) {
    return null;
  }

  return token;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.setHeader("WWW-Authenticate", "Bearer");
    return next(
      new AppError(401, "Authentication required", "AUTH_TOKEN_MISSING"),
    );
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    res.setHeader("WWW-Authenticate", "Bearer");

    // A distinct code lets the frontend refresh the token instead of logging the user out
    if (err instanceof jwt.TokenExpiredError) {
      return next(
        new AppError(401, "Access token has expired", "AUTH_TOKEN_EXPIRED"),
      );
    }

    return next(
      new AppError(401, "Invalid access token", "AUTH_TOKEN_INVALID"),
    );
  }
}
