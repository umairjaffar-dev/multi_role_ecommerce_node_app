import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// Temporary route to verify the global error handler (remove after testing)
healthRouter.get("/health/error", async () => {
  throw new Error("Deliberate test error");
});
