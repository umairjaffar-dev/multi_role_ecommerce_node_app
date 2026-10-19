import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { CreateProductSchema, UpdateProductSchema } from "./products.validation.js";
import {
  productCreateController,
  productGetByIdController,
  productUpdateController,
} from "./products.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { IdParamSchema } from "../../utils/commonSchemas.js";

export const adminProductsRouter = Router();

adminProductsRouter
  .route("/")
  .post(validate({ body: CreateProductSchema }), productCreateController)
  .all(methodNotAllowed(["POST"]));

// Route to get product or update it.
adminProductsRouter
  .route("/:id")
  .get(validate({ params: IdParamSchema }), productGetByIdController)
  .patch(
    validate({ params: IdParamSchema, body: UpdateProductSchema }),
    productUpdateController,
  )
  .all(methodNotAllowed(["GET", "PATCH"]));
