import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { CreateProductSchema } from "./products.validation.js";
import { productCreateController } from "./products.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";

export const adminProductsRouter = Router();

adminProductsRouter
  .route("/")
  .post(validate({ body: CreateProductSchema }), productCreateController)
  .all(methodNotAllowed(["POST"]));
