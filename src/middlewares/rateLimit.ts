import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { AppError } from "../utils/AppError.js";

function createRateLimiter(limit: number, windowMs: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req: Request, _res: Response, next: NextFunction) =>
      next(
        new AppError(
          429,
          "Too many requests, please try again later",
          "TOO_MANY_REQUESTS",
        ),
      ),
  });
}

export const loginRateLimiter = createRateLimiter(10, 15 * 60 * 1000);
export const registerRateLimiter = createRateLimiter(5, 60 * 60 * 1000);
export const refreshRateLimiter = createRateLimiter(30, 15 * 60 * 1000);
