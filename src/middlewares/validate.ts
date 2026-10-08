import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

type RequestSchemasType = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

type ValidationIssueType = {
  location: keyof RequestSchemasType;
  field: string;
  message: string;
};

export function validate(schemas: RequestSchemasType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const issues: Array<ValidationIssueType> = [];

    for (const location of ["body", "params", "query"] as const) {
      const schema = schemas[location];
      if (!schema) continue;

      // A missing body becomes {} so clients get per-field errors instead of one generic error
      const input = location === "body" ? (req.body ?? {}) : req[location];
      const result = schema.safeParse(input);

      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({
            location,
            field: issue.path.join("."),
            message: issue.message,
          });
        }
        continue;
      }

      // Express 5 exposes req.query as a getter, so a plain assignment would fail
      Object.defineProperty(req, location, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    if (issues.length > 0) {
      return next(
        new AppError(400, "Validation failed", "VALIDATION_ERROR", issues),
      );
    }

    next();
  };
}
