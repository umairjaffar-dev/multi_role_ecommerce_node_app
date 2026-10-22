import type { Request, Response } from "express";
import type { IdParamSchemaType } from "../../utils/commonSchemas.js";
import {
  productImageDeleteService,
  productImageReorderService,
  productImageUploadService,
} from "./productImages.service.js";
import type {
  ProductImageParamSchemaType,
  ReorderProductImagesSchemaType,
} from "./productImages.validation.js";

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

export async function productImageDeleteController(
  req: Request<ProductImageParamSchemaType>,
  res: Response,
) {
  await productImageDeleteService(req.params.id, req.params.imageId);

  req.log.info(
    {
      productId: req.params.id,
      imageId: req.params.imageId,
      adminId: req.user?.id,
    },
    "Product image deleted",
  );

  res.status(204).send();
}

export async function productImageReorderController(
  req: Request<IdParamSchemaType, unknown, ReorderProductImagesSchemaType>,
  res: Response,
) {
  const images = await productImageReorderService(
    req.params.id,
    req.body.imageIds,
  );

  req.log.info(
    { productId: req.params.id, adminId: req.user?.id },
    "Product images reordered",
  );

  res.status(200).json({ success: true, data: images });
}
