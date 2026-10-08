import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Known, expected errors (validation, not found, forbidden, ...)
  if (err instanceof AppError) {
    req.log.warn({ err, code: err.code }, err.message);
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Malformed JSON body sent by the client
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
      },
    });
  }

  // Unknown errors: log full details, never leak internals to the client
  req.log.error({ err }, "Unhandled error");
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      ...(env.isProduction
        ? {}
        : { stack: err instanceof Error ? err.stack : String(err) }),
    },
  });
}
