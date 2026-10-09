import type { Request, Response } from "express";
import { userRegisterService } from "./auth.service.js";
import type { RegisterUserSchemaType } from "./auth.validation.js";

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
