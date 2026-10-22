import type { Request, Response } from "express";
import type {
  AdminListProductsQuerySchemaType,
  CreateProductSchemaType,
  ListProductsQuerySchemaType,
  ProductSlugParamSchemaType,
  RestoreProductSchemaType,
  UpdateProductSchemaType,
} from "./products.validation.js";
import {
  productCreateService,
  productDeleteService,
  productGetByIdService,
  productGetBySlugPublicService,
  productListAdminService,
  productListPublicService,
  productRestoreService,
  productUpdateService,
} from "./products.service.js";
import type { IdParamSchemaType } from "../../utils/commonSchemas.js";
import { getValidatedQuery } from "../../middlewares/validate.js";

export async function productCreateController(
  req: Request<unknown, unknown, CreateProductSchemaType>,
  res: Response,
) {
  const product = await productCreateService(req.body);

  req.log.info(
    { productId: product.id, adminId: req.user?.id },
    "Product created",
  );

  res.status(201).json({ success: true, data: product });
}

export async function productListAdminController(req: Request, res: Response) {
  const query = getValidatedQuery<AdminListProductsQuerySchemaType>(req);

  const { items, meta } = await productListAdminService(query);

  res.status(200).json({ success: true, data: items, meta });
}

// Public route
export async function productListPublicController(req: Request, res: Response) {
  const query = getValidatedQuery<ListProductsQuerySchemaType>(req);

  const { items, meta } = await productListPublicService(query);

  res.status(200).json({ success: true, data: items, meta });
}

export async function productGetByIdController(
  req: Request<IdParamSchemaType>,
  res: Response,
) {
  const product = await productGetByIdService(req.params.id);
  res.status(200).json({ success: true, data: product });
}

// Public route
export async function productGetBySlugPublicController(
  req: Request<ProductSlugParamSchemaType>,
  res: Response,
) {
  const product = await productGetBySlugPublicService(req.params.slug);

  res.status(200).json({ success: true, data: product });
}

// Update product controller.
export async function productUpdateController(
  req: Request<IdParamSchemaType, unknown, UpdateProductSchemaType>,
  res: Response,
) {
  const product = await productUpdateService(req.params.id, req.body);

  req.log.info(
    { productId: product.id, adminId: req.user?.id },
    "Product updated",
  );

  res.status(200).json({ success: true, data: product });
}

// Delete Product Controller.
export async function productDeleteController(
  req: Request<IdParamSchemaType>,
  res: Response,
) {
  await productDeleteService(req.params.id);

  req.log.info(
    { productId: req.params.id, adminId: req.user?.id },
    "Product deleted",
  );

  res.status(204).send();
}

export async function productRestoreController(
  req: Request<IdParamSchemaType, unknown, RestoreProductSchemaType>,
  res: Response,
) {
  const product = await productRestoreService(req.params.id, req.body);

  req.log.info(
    { productId: product.id, adminId: req.user?.id },
    "Product restored",
  );

  res.status(200).json({ success: true, data: product });
}
