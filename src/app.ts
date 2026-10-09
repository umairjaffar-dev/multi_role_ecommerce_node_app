import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes/index.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authenticate } from "./middlewares/authenticate.js";

export function createApp() {
  const app = express();

  // Trust the first proxy (Nginx / load balancer) so req.ip and secure cookies work
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // 1. Security headers
  app.use(helmet());

  // 2. CORS: only our frontend may call the API, with cookies
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  );

  // 3. Request logging with a unique request ID per request
  app.use(
    pinoHttp({
      logger: logger,
      genReqId: (req, res) => {
        const existingId = req.headers["x-request-id"];
        const id = typeof existingId === "string" ? existingId : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    }),
  );

  // 4. Body and cookie parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // 5. API routes
  app.use("/api/v1", apiRouter);
  app.get("/", authenticate, (_req, res) => {
    res.json({ success: true, data: { message: "Server is running." } });
  });

  // 6. 404 + global error handler (must be registered last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
