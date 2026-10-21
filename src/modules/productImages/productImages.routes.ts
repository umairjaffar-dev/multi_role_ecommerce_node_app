import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { IdParamSchema } from "../../utils/commonSchemas.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { uploadSingleImage } from "../../middlewares/uploadImage.js";
import { productImageUploadController } from "./productImages.controller.js";

// Mounted at /api/v1/admin/products/:id/images; mergeParams exposes :id from the parent path
export const adminProductImagesRouter = Router({ mergeParams: true });

adminProductImagesRouter
  .route("/")
  .post(
    // Reject a bad product id before reading the file
    validate({ params: IdParamSchema }),
    uploadSingleImage("image"),
    productImageUploadController,
  )
  .all(methodNotAllowed(["POST"]));
