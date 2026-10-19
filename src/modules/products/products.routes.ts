import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import {
  AdminListProductsQuerySchema,
  CreateProductSchema,
  ProductSlugParamSchema,
  UpdateProductSchema,
} from "./products.validation.js";
import {
  productCreateController,
  productDeleteController,
  productGetByIdController,
  productGetBySlugPublicController,
  productListAdminController,
  productUpdateController,
} from "./products.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { IdParamSchema } from "../../utils/commonSchemas.js";

export const productsRouter = Router();

productsRouter
  .route("/:slug")
  .get(
    validate({ params: ProductSlugParamSchema }),
    productGetBySlugPublicController,
  )
  .all(methodNotAllowed(["GET"]));

export const adminProductsRouter = Router();

adminProductsRouter
  .route("/")
  .get(
    validate({ query: AdminListProductsQuerySchema }),
    productListAdminController,
  )
  .post(validate({ body: CreateProductSchema }), productCreateController)
  .all(methodNotAllowed(["GET", "POST"]));

// Route to get product or update it.
adminProductsRouter
  .route("/:id")
  .get(validate({ params: IdParamSchema }), productGetByIdController)
  .patch(
    validate({ params: IdParamSchema, body: UpdateProductSchema }),
    productUpdateController,
  )
  .delete(validate({ params: IdParamSchema }), productDeleteController)
  .all(methodNotAllowed(["GET", "PATCH", "DELETE"]));
