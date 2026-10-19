import type { NextFunction, Request, Response } from "express";
import type { CreateProductSchemaType, UpdateProductSchemaType } from "./products.validation.js";
import { productCreateService, productGetByIdService, productUpdateService } from "./products.service.js";
import type { IdParamSchemaType } from "../../utils/commonSchemas.js";

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

export async function productGetByIdController(
  req: Request<IdParamSchemaType>,
  res: Response,
  next: NextFunction,
) {
  const product = await productGetByIdService(req.params.id);
  res.status(200).json({ success: true, data: product });
}

// Update product controller.
export async function productUpdateController(
  req: Request<IdParamSchemaType, unknown, UpdateProductSchemaType>,
  res: Response,
  next: NextFunction,
) {
  const product = await productUpdateService(req.params.id, req.body);

  req.log.info(
    { productId: product.id, adminId: req.user?.id },
    "Product updated",
  );

  res.status(200).json({ success: true, data: product });
}
