import type { Request, Response } from "express";
import type { RegisterInputType } from "./auth.validation.js";
import { authService } from "./auth.service.js";

export async function userRegisterController(
  req: Request<unknown, unknown, RegisterInputType>,
  res: Response,
) {
  const user = await authService.registerUser(req.body);

  req.log.info({ userId: user.id }, "User registered");

  res.status(201).json({
    success: true,
    data: { user },
  });
}
