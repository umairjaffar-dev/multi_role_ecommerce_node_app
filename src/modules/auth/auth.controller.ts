import type { Request, Response } from "express";
import {
  userLoginService,
  userLogoutService,
  userRefreshTokenService,
  userRegisterService,
} from "./auth.service.js";
import type {
  LoginUserSchemaType,
  RegisterUserSchemaType,
} from "./auth.validation.js";
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
} from "../../lib/cookies.js";
import { AppError } from "../../utils/AppError.js";

export async function userRegisterController(
  req: Request<unknown, unknown, RegisterUserSchemaType>,
  res: Response,
) {
  const user = await userRegisterService(req.body);

  req.log.info({ userId: user.id }, "User registered");

  res.status(201).json({
    success: true,
    data: user,
  });
}

export async function userLoginController(
  req: Request<unknown, unknown, LoginUserSchemaType>,
  res: Response,
) {
  const { user, accessToken, refreshToken } = await userLoginService(req.body);
  setRefreshTokenCookie(res, refreshToken);

  req.log.info({ userId: user.id }, "User logged in");

  res.status(200).json({
    success: true,
    data: { ...user, accessToken },
  });
}

function readRefreshTokenCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function userRefreshTokenController(req: Request, res: Response) {
  const presentedToken = readRefreshTokenCookie(req);
  if (!presentedToken) {
    throw new AppError(
      401,
      "Refresh token is missing",
      "REFRESH_TOKEN_MISSING",
    );
  }

  const { user, accessToken, refreshToken } =
    await userRefreshTokenService(presentedToken);

  setRefreshTokenCookie(res, refreshToken);

  req.log.info({ userId: user.id }, "Access token refreshed");

  res.status(200).json({
    success: true,
    data: { ...user, accessToken },
  });
}

export async function userLogoutController(req: Request, res: Response) {
  await userLogoutService(readRefreshTokenCookie(req));

  clearRefreshTokenCookie(res);

  req.log.info("User logged out");

  res.status(204).send();
}
