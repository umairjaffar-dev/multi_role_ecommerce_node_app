import type { Request, Response } from "express";
import { userLoginService, userRegisterService } from "./auth.service.js";
import type {
  LoginUserSchemaType,
  RegisterUserSchemaType,
} from "./auth.validation.js";

export async function userRegisterController(
  req: Request<unknown, unknown, RegisterUserSchemaType>,
  res: Response,
) {
  const user = await userRegisterService(req.body);

  req.log.info({ userId: user.id }, "User registered");

  res.status(201).json({
    success: true,
    data: { user },
  });
}

export async function userLoginController(
  req: Request<unknown, unknown, LoginUserSchemaType>,
  res: Response,
) {
  const { user, accessToken } = await userLoginService(req.body);

  req.log.info({ userId: user.id }, "User logged in");

  res.status(200).json({
    success: true,
    data: { user, accessToken },
  });
}
