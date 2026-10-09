import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../lib/jwt.js";

const BEARER_PREFIX = "Bearer ";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith(BEARER_PREFIX)) {
    res.setHeader("WWW-Authenticate", "Bearer");
    return next(
      new AppError(401, "Authentication required", "AUTH_TOKEN_MISSING"),
    );
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

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
