import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../utils/AppError.js";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Memory storage: the file arrives as a Buffer in req.file, nothing touches the server's disk.
// The size limit makes Multer stop reading as soon as a file grows past 5 MB.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1, fields: 0 },
});

// Wraps Multer so its errors become our normal AppError responses instead of 500s
export function uploadSingleImage(fieldName: string) {
  const handler = imageUpload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new AppError(413, "Image must be at most 5 MB", "IMAGE_TOO_LARGE"),
          );
        }
        // Wrong field name, more than one file, or extra text fields
        return next(
          new AppError(
            400,
            `Send exactly one file in the "${fieldName}" field`,
            "INVALID_UPLOAD",
          ),
        );
      }
      next(err);
    });
  };
}
