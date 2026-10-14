import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { requiredRole } from "../../middlewares/requireRole.js";
import { adminPingController } from "./admin.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";

export const adminRouter = Router();

// Every route registered below requires a logged-in admin
adminRouter.use(authenticate, requiredRole("admin"));

adminRouter
  .route("/ping")
  .get(adminPingController)
  .all(methodNotAllowed(["GET"]));
