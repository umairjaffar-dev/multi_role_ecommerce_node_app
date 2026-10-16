import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";
import { getPgErrorDetails } from "../utils/dbErrors.js";

// body-parser (via http-errors) marks client errors with `status` and `expose: true`
// e.g. 413 entity.too.large, 415 charset.unsupported, 400 encoding.unsupported
function isHttpClientError(
  err: unknown,
): err is { status: number; message: string; type?: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof err.status === "number" &&
    err.status >= 400 &&
    err.status < 500 &&
    "expose" in err &&
    err.expose === true
  );
}

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

  if (isHttpClientError(err)) {
    req.log.warn({ err }, err.message);
    return res.status(err.status).json({
      success: false,
      error: {
        code:
          err.type === "entity.too.large" ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
        message: err.message,
      },
    });
  }

  // Unknown errors: log full details, never leak internals to the client
  // Drizzle wraps the Postgres error; surface its code/constraint so the real cause is visible
  const database = getPgErrorDetails(err);
  req.log.error({ err, database }, "Unhandled error");
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      ...(env.isProduction
        ? {}
        : {
            stack: err instanceof Error ? err.stack : String(err),
            ...(database ? { database } : {}),
          }),
    },
  });
}
