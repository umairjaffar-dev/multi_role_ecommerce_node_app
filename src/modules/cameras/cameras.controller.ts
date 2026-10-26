import type { Request, Response } from "express";
import type {
  CreateCameraSchemaType,
  ListCamerasQuerySchemaType,
  UpdateCameraSchemaType,
} from "./cameras.validation.js";
import { getValidatedQuery } from "../../middlewares/validate.js";
import type { IdParamSchemaType } from "../../utils/commonSchemas.js";
import {
  cameraCreateService,
  cameraDeleteService,
  cameraGetByIdService,
  cameraListService,
  cameraUpdateService,
} from "./cameras.service.js";

// GET /admin/cameras
export async function cameraListController(
  req: Request,
  res: Response,
): Promise<void> {
  const query = getValidatedQuery<ListCamerasQuerySchemaType>(req);

  const { items, meta } = await cameraListService(query);

  res.status(200).json({ success: true, data: items, meta });
}

// GET /admin/cameras/:id
export async function cameraGetByIdController(
  req: Request<IdParamSchemaType>,
  res: Response,
): Promise<void> {
  const camera = await cameraGetByIdService(req.params.id);

  res.status(200).json({ success: true, data: camera });
}

// POST /admin/cameras
export async function cameraCreateController(
  req: Request<unknown, unknown, CreateCameraSchemaType>,
  res: Response,
): Promise<void> {
  const camera = await cameraCreateService(req.body);

  // Never log req.body here: it contains the raw RTSP URL with the camera password
  req.log.info(
    {
      cameraId: camera.id,
      streamPath: camera.streamPath,
      adminId: req.user?.id,
    },
    "Camera created",
  );

  res.status(201).json({ success: true, data: camera });
}

// PATCH /admin/cameras/:id
export async function cameraUpdateController(
  req: Request<IdParamSchemaType, unknown, UpdateCameraSchemaType>,
  res: Response,
): Promise<void> {
  const camera = await cameraUpdateService(req.params.id, req.body);

  req.log.info(
    {
      cameraId: camera.id,
      // Field names only, never values, so a changed rtspUrl is not leaked into logs
      updatedFields: Object.keys(req.body),
      adminId: req.user?.id,
    },
    "Camera updated",
  );

  res.status(200).json({ success: true, data: camera });
}

// DELETE /admin/cameras/:id
export async function cameraDeleteController(
  req: Request<IdParamSchemaType>,
  res: Response,
): Promise<void> {
  await cameraDeleteService(req.params.id);

  req.log.info(
    { cameraId: req.params.id, adminId: req.user?.id },
    "Camera deleted",
  );

  res.status(204).send();
}
