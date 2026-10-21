import type { Request, Response } from "express";
import type { IdParamSchemaType } from "../../utils/commonSchemas.js";
import { productImageUploadService } from "./productImages.service.js";

export async function productImageUploadController(
  req: Request<IdParamSchemaType>,
  res: Response,
) {
  const image = await productImageUploadService(req.params.id, req.file);

  req.log.info(
    { productId: req.params.id, imageId: image.id, adminId: req.user?.id },
    "Product image uploaded",
  );

  res.status(201).json({ success: true, data: image });
}
