// ── Public ──

import type { Request, Response } from "express";
import { getValidatedQuery } from "../../middlewares/validate.js";
import type {
  AdminListCategoriesQuerySchemaType,
  CategorySlugParamSchemaType,
  CreateCategorySchemaType,
  ListCategoriesQuerySchemaType,
  UpdateCategorySchemaType,
} from "./categories.validation.js";
import {
  categoryCreateService,
  categoryDeleteService,
  categoryGetByIdService,
  categoryGetBySlugService,
  categoryListService,
  categoryUpdateService,
} from "./categories.service.js";
import type { IdParamSchemaType } from "../../utils/commonSchemas.js";

// ── Public ──

export async function categoryListPublicController(
  req: Request,
  res: Response,
) {
  const query = getValidatedQuery<ListCategoriesQuerySchemaType>(req);

  // Customers only ever see active categories, whatever the query says
  const { items, meta } = await categoryListService({
    ...query,
    isActive: true,
  });

  res.status(200).json({ success: true, data: items, meta });
}

export async function categoryGetBySlugController(
  req: Request<CategorySlugParamSchemaType>,
  res: Response,
) {
  const category = await categoryGetBySlugService(req.params.slug);

  res.status(200).json({ success: true, data: category });
}

// ── Admin ──
// Get all categories.
export async function categoryListAdminController(req: Request, res: Response) {
  const query = getValidatedQuery<AdminListCategoriesQuerySchemaType>(req);

  const { items, meta } = await categoryListService(query);

  res.status(200).json({ success: true, data: items, meta });
}

// get category by Id.
export async function categoryGetByIdController(
  req: Request<IdParamSchemaType>,
  res: Response,
) {
  const category = await categoryGetByIdService(req.params.id);

  res.status(200).json({ success: true, data: category });
}

// create a new category.
export async function categoryCreateController(
  req: Request<unknown, unknown, CreateCategorySchemaType>,
  res: Response,
) {
  const category = await categoryCreateService(req.body);

  req.log.info(
    { categoryId: category.id, adminId: req.user?.id },
    "Category created",
  );

  res.status(201).json({ success: true, data: category });
}

// update category by Id.
export async function categoryUpdateController(
  req: Request<IdParamSchemaType, unknown, UpdateCategorySchemaType>,
  res: Response,
) {
  const category = await categoryUpdateService(req.params.id, req.body);

  req.log.info(
    { categoryId: category.id, adminId: req.user?.id },
    "Category updated",
  );

  res.status(200).json({ success: true, data: category });
}

// delete category by Id.
export async function categoryDeleteController(
  req: Request<IdParamSchemaType>,
  res: Response,
) {
  await categoryDeleteService(req.params.id);

  req.log.info(
    { categoryId: req.params.id, adminId: req.user?.id },
    "Category deleted",
  );

  res.status(204).send();
}
