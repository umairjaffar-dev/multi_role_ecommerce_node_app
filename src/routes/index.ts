import { Router } from "express";
import { healthRouter } from "./health.routes.js";

// Aggregates all module routers under /api/v1
export const apiRouter = Router();

apiRouter.use(healthRouter);
