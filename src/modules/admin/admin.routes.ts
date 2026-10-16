import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { requiredRole } from "../../middlewares/requireRole.js";
import { adminPingController } from "./admin.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { adminCategoriesRouter } from "../categories/categories.routes.js";

export const adminRouter = Router();

// Every route registered below requires a logged-in admin
adminRouter.use(authenticate, requiredRole("admin"));

// Test router to test admin' permission and if user then error message.
adminRouter
  .route("/ping")
  .get(adminPingController)
  .all(methodNotAllowed(["GET"]));

// The categories are access by only admin.
adminRouter.use("/categories", adminCategoriesRouter);
