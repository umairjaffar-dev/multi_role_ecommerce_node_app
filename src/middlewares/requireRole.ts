import type { NextFunction, Request, Response } from "express";
import type { UserRoleType } from "../db/schema/users.schema.js";
import { AppError } from "../utils/AppError.js";

export function requiredRole(...allowedRoles: Array<UserRoleType>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError(401, "Authentication required", "AUTH_TOKEN_MISSING"),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          "You do not have permission to perform this action",
          "FORBIDDEN",
        ),
      );
    }

    next();
  };
}
