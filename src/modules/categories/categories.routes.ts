import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import {
  AdminListCategoriesQuerySchema,
  CategorySlugParamSchema,
  CreateCategorySchema,
  ListCategoriesQuerySchema,
  UpdateCategorySchema,
} from "./categories.validation.js";
import {
  categoryCreateController,
  categoryDeleteController,
  categoryGetByIdController,
  categoryGetBySlugController,
  categoryListAdminController,
  categoryListPublicController,
  categoryUpdateController,
} from "./categories.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { IdParamSchema } from "../../utils/commonSchemas.js";

export const categoriesRouter = Router();

// get all categories for user route.
categoriesRouter
  .route("/")
  .get(
    validate({ query: ListCategoriesQuerySchema }),
    categoryListPublicController,
  )
  .all(methodNotAllowed(["GET"]));

// get category by slug route.
categoriesRouter
  .route("/:slug")
  .get(
    validate({ params: CategorySlugParamSchema }),
    categoryGetBySlugController,
  )
  .all(methodNotAllowed(["GET"]));

// Admin: mounted inside adminRouter at /api/v1/admin/categories, which already requires an admin
export const adminCategoriesRouter = Router();

// get all categories for admin route.
adminCategoriesRouter
  .route("/")
  .get(
    validate({ query: AdminListCategoriesQuerySchema }),
    categoryListAdminController,
  )
  .post(validate({ body: CreateCategorySchema }), categoryCreateController)
  .all(methodNotAllowed(["GET", "POST"]));

// update, delete or get category by Id, and this route is only for admin.
adminCategoriesRouter
  .route("/:id")
  .get(validate({ params: IdParamSchema }), categoryGetByIdController)
  .patch(
    validate({ params: IdParamSchema, body: UpdateCategorySchema }),
    categoryUpdateController,
  )
  .delete(validate({ params: IdParamSchema }), categoryDeleteController)
  .all(methodNotAllowed(["GET", "PATCH", "DELETE"]));
