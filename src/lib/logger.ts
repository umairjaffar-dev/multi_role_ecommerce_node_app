import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.logLevel,

  //   On each log this will be added automatically to the log object
  base: {
    env: env.nodeEnv,
  },

  //   This will redact the paths from the log object
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.confirmPassword",
      "*.passwordHash",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[REDACTED]",
  },

  // //   This will format the log object
  // formatters: {
  //   level: (label) => ({ level: label.toUpperCase() }),
  // },

  //   This will transport the log object to the console
  //   Development: colorful and readable output
  //   Production: raw JSON output(for easy parsing by log management tools)
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
});
