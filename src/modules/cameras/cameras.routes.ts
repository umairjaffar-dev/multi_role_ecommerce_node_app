// Mounted inside adminRouter at /api/v1/admin/cameras, which already requires an admin.

import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import {
  CreateCameraSchema,
  ListCamerasQuerySchema,
  UpdateCameraSchema,
} from "./cameras.validation.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { IdParamSchema } from "../../utils/commonSchemas.js";
import {
  cameraCreateController,
  cameraDeleteController,
  cameraGetByIdController,
  cameraListController,
  cameraUpdateController,
} from "./cameras.controller.js";

// Cameras hold secret stream credentials, so there is no public router for this module.
export const adminCamerasRouter = Router();

// List cameras (paginated) or register a new camera.
adminCamerasRouter
  .route("/")
  .get(validate({ query: ListCamerasQuerySchema }), cameraListController)
  .post(validate({ body: CreateCameraSchema }), cameraCreateController)
  .all(methodNotAllowed(["GET", "POST"]));

// Get, update or delete a single camera by id.
adminCamerasRouter
  .route("/:id")
  .get(validate({ params: IdParamSchema }), cameraGetByIdController)
  .patch(
    validate({ params: IdParamSchema, body: UpdateCameraSchema }),
    cameraUpdateController,
  )
  .delete(validate({ params: IdParamSchema }), cameraDeleteController)
  .all(methodNotAllowed(["GET", "PATCH", "DELETE"]));
