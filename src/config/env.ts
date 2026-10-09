import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });
const JWT_DURATION_REGEX = /^\d+[smhd]$/;

const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    key,
    value?.trim() === "" ? undefined : value,
  ]),
);

const EnvSchema = z.object({
  // ── App ──
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.url(),
  CLIENT_URL: z.url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  // ── Database ──
  DATABASE_URL: z.url("DATABASE_URL must be a valid connection string"),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  // ── JWT ──
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(
      JWT_DURATION_REGEX,
      "JWT_ACCESS_EXPIRES_IN must look like 15m, 1hr or 7d",
    )
    .default("15m"),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(
      JWT_DURATION_REGEX,
      "JWT_REFRESH_EXPIRES_IN must look like 15m, 1hr or 7d",
    )
    .default("7d"),

  // ── Security ──
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
});

const parsed = EnvSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:\n");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const e = parsed.data;

export const env = {
  nodeEnv: e.NODE_ENV,
  isProduction: e.NODE_ENV === "production",
  isTest: e.NODE_ENV === "test",
  port: e.PORT,
  appUrl: e.APP_URL,
  clientUrl: e.CLIENT_URL,
  logLevel: e.LOG_LEVEL,

  db: {
    url: e.DATABASE_URL,
    poolMax: e.DB_POOL_MAX,
  },

  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: e.JWT_REFRESH_EXPIRES_IN,
  },

  security: {
    bcryptSaltRounds: e.BCRYPT_SALT_ROUNDS,
  },
} as const;

export type EnvType = typeof env;
