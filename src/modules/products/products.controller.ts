import type { Request, Response } from "express";
import type { CreateProductSchemaType } from "./products.validation.js";
import { productCreateService } from "./products.service.js";

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
