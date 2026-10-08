import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

// Responds with 405 when a route exists but does not support the requested HTTP method
export function methodNotAllowed(allowedMethods: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Allow", allowedMethods.join(", "));
    next(
      new AppError(
        405,
        `Method ${req.method} is not allowed on ${req.originalUrl}. Allowed: ${allowedMethods.join(", ")}`,
        "METHOD_NOT_ALLOWED",
      ),
    );
  };
}
