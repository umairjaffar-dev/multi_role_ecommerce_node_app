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
  NODE_ENV: z.enum(["development", "test", "production"]),
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
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(
      JWT_DURATION_REGEX,
      "JWT_ACCESS_EXPIRES_IN must look like 15m, 1h or 7d",
    )
    .default("15m"),

  // ── Refresh token ──
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  // ── Security ──
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  //  ── Object storage (any S3-compatible service) ──
  S3_ENDPOINT: z.url("S3_ENDPOINT must be a valid URL").optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"], {
      error: "S3_FORCE_PATH_STYLE must be true or false",
    })
    .default("false")
    .transform((value) => value === "true"),
  S3_REGION: z
    .string({ error: "S3_REGION is required" })
    .min(1, "S3_REGION is required"),
  S3_BUCKET: z
    .string({ error: "S3_BUCKET is required" })
    .min(3, "S3_BUCKET is required"),
  S3_ACCESS_KEY_ID: z
    .string({ error: "S3_ACCESS_KEY_ID is required" })
    .min(1, "S3_ACCESS_KEY_ID is required"),
  S3_SECRET_ACCESS_KEY: z
    .string({ error: "S3_SECRET_ACCESS_KEY is required" })
    .min(1, "S3_SECRET_ACCESS_KEY is required"),
  // Optional public/CDN base URL; without it, image URLs are short-lived signed URLs
  S3_PUBLIC_BASE_URL: z
    .url("S3_PUBLIC_BASE_URL must be a valid URL")
    .optional(),
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
    accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
  },

  refreshToken: {
    ttlDays: e.REFRESH_TOKEN_TTL_DAYS,
  },

  security: {
    bcryptSaltRounds: e.BCRYPT_SALT_ROUNDS,
  },

  storage: {
    endpoint: e.S3_ENDPOINT,
    forcePathStyle: e.S3_FORCE_PATH_STYLE,
    region: e.S3_REGION,
    bucket: e.S3_BUCKET,
    accessKeyId: e.S3_ACCESS_KEY_ID,
    secretAccessKey: e.S3_SECRET_ACCESS_KEY,
    publicBaseUrl: e.S3_PUBLIC_BASE_URL,
  },
} as const;

export type EnvType = typeof env;
