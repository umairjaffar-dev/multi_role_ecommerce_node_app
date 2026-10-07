import { Router } from "express";
import { checkDatabaseConnection } from "../db/index.js";

export const healthRouter = Router();

healthRouter.get("/health", async (req, res) => {
  let database: "up" | "down" = "up";

  try {
    await checkDatabaseConnection();
  } catch (err) {
    database = "down";
    req.log.error({ err }, "Health check: database unreachable");
  }

  const isHealthy = database === "up";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      database,
      status: isHealthy ? "ok" : "degraded",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});
