import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { LoginUserSchema, RegisterUserSchema } from "./auth.validation.js";
import {
  userLoginController,
  userLogoutController,
  userRefreshTokenController,
  userRegisterController,
} from "./auth.controller.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from "../../middlewares/rateLimit.js";

export const authRouter = Router();

authRouter
  .route("/register")
  .post(
    registerRateLimiter,
    validate({ body: RegisterUserSchema }),
    userRegisterController,
  )
  .all(methodNotAllowed(["POST"]));

authRouter
  .route("/login")
  .post(
    loginRateLimiter,
    validate({ body: LoginUserSchema }),
    userLoginController,
  )
  .all(methodNotAllowed(["POST"]));

authRouter
  .route("/refresh")
  .post(refreshRateLimiter, userRefreshTokenController)
  .all(methodNotAllowed(["POST"]));

authRouter
  .route("/logout")
  .post(userLogoutController)
  .all(methodNotAllowed(["POST"]));
