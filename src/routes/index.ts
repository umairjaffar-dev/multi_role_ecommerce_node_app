import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { categoriesRouter } from "../modules/categories/categories.routes.js";
import { productsRouter } from "../modules/products/products.routes.js";

// Aggregates all module routers under /api/v1
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/products", productsRouter);
