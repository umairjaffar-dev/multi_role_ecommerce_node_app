import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { RegisterUserSchema } from "./auth.validation.js";
import { userRegisterController } from "./auth.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";

export const authRouter = Router();

authRouter
  .route("/register")
  .post(validate({ body: RegisterUserSchema }), userRegisterController)
  .all(methodNotAllowed(["POST"]));
