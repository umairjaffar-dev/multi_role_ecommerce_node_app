import dotenv from "dotenv";
import z from "zod";

dotenv.config({ quiet: true });

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

  // ── JWT ──
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // // ── Storage ──
  // STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),

  // // ── AWS S3 (optional yahan, conditional check neeche superRefine mein) ──
  // AWS_REGION: z.string().optional(),
  // AWS_ACCESS_KEY_ID: z.string().optional(),
  // AWS_SECRET_ACCESS_KEY: z.string().optional(),
  // AWS_S3_BUCKET: z.string().optional(),
});
//   .superRefine((data, ctx) => {
//     if (data.STORAGE_DRIVER !== "s3") return;

//     const requiredS3Keys = [
//       "AWS_REGION",
//       "AWS_ACCESS_KEY_ID",
//       "AWS_SECRET_ACCESS_KEY",
//       "AWS_S3_BUCKET",
//     ] as const;

//     for (const key of requiredS3Keys) {
//       if (!data[key]) {
//         ctx.addIssue({
//           code: "custom",
//           path: [key],
//           message: `${key} is required when STORAGE_DRIVER=s3`,
//         });
//       }
//     }
//   });

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
  },

  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: e.JWT_REFRESH_EXPIRES_IN,
  },

  //   storage: {
  //     driver: e.STORAGE_DRIVER,
  //     s3: {
  //       region: e.AWS_REGION,
  //       accessKeyId: e.AWS_ACCESS_KEY_ID,
  //       secretAccessKey: e.AWS_SECRET_ACCESS_KEY,
  //       bucket: e.AWS_S3_BUCKET,
  //     },
  //   },
} as const;

export type Env = typeof env;
