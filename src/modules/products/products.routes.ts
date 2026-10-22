import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import {
  AdminListProductsQuerySchema,
  CreateProductSchema,
  ListProductsQuerySchema,
  ProductSlugParamSchema,
  RestoreProductSchema,
  UpdateProductSchema,
} from "./products.validation.js";
import {
  productCreateController,
  productDeleteController,
  productGetByIdController,
  productGetBySlugPublicController,
  productListAdminController,
  productListPublicController,
  productRestoreController,
  productUpdateController,
} from "./products.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { IdParamSchema } from "../../utils/commonSchemas.js";
import { adminProductImagesRouter } from "../productImages/productImages.routes.js";

export const productsRouter = Router();

// Public: mounted at /api/v1/products, no login needed (guests can browse)
productsRouter
  .route("/")
  .get(
    validate({ query: ListProductsQuerySchema }),
    productListPublicController,
  )
  .all(methodNotAllowed(["GET"]));

productsRouter
  .route("/:slug")
  .get(
    validate({ params: ProductSlugParamSchema }),
    productGetBySlugPublicController,
  )
  .all(methodNotAllowed(["GET"]));

export const adminProductsRouter = Router();

adminProductsRouter.use("/:id/images", adminProductImagesRouter);

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

// POST, not PATCH: restoring is an action on the product, not an edit of its fields
adminProductsRouter
  .route("/:id/restore")
  .post(
    validate({ params: IdParamSchema, body: RestoreProductSchema }),
    productRestoreController,
  )
  .all(methodNotAllowed(["POST"]));
