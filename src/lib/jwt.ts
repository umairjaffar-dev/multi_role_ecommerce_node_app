import jwt, { type SignOptions } from "jsonwebtoken";
import z from "zod";
import { env } from "../config/env.js";

const JWT_ALGORITHM = "HS256";

export const AccessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  role: z.enum(["user", "admin"]),
  type: z.literal("access"),
});

export type AccessTokenPayloadSchemaType = z.infer<
  typeof AccessTokenPayloadSchema
>;

export function signAccessToken(
  payload: Omit<AccessTokenPayloadSchemaType, "type">,
) {
  return jwt.sign({ ...payload, type: "access" }, env.jwt.accessSecret, {
    algorithm: JWT_ALGORITHM,
    // env validates the format; jsonwebtoken types it as a template literal, so a cast is needed
    expiresIn: env.jwt.accessExpiresIn as SignOptions["expiresIn"],
  });
}

// Throws jwt.TokenExpiredError / jwt.JsonWebTokenError / ZodError on an invalid token
export function verifyAccessToken(token: string): AccessTokenPayloadSchemaType {
  const decode = jwt.verify(token, env.jwt.accessSecret, {
    algorithms: [JWT_ALGORITHM],
  });
  return AccessTokenPayloadSchema.parse(decode);
}
