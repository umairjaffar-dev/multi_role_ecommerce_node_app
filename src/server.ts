import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { checkDatabaseConnection, closeDatabase } from "./db/index.js";
import { storage } from "./lib/storage/index.js";
import { startCameraPathsReconcileLoop, stopCameraPathsReconcileLoop } from "./modules/cameras/cameras.reconcile.js";

async function bootstrap() {
  // Fail fast: do not accept traffic if the database is unreachable
  try {
    await checkDatabaseConnection();
    logger.info("Database connected");
  } catch (err) {
    logger.fatal({ err }, "Failed to connect to the database");
    process.exit(1);
  }

  // Same rule for object storage: product images would fail on every upload otherwise
  try {
    await storage.checkConnection();
    logger.info("Object storage connected");
  } catch (err) {
    logger.fatal({ err }, "Failed to connect to object storage");
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`Server is running at http://localhost:${env.port}`);
  });

  // MediaMTX is optional for the shop, so it is not a fail-fast check like the DB:
  // the loop warns while MediaMTX is down and repairs camera paths once it is back
  startCameraPathsReconcileLoop();

  let isShuttingDown = false;

  // Graceful shutdown: Stop accepting new requests, finished in-flight ones, then exit
  function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);
    stopCameraPathsReconcileLoop();

    server.close(async () => {
      logger.info("HTTP server closed");
      await closeDatabase();
      process.exit(0);
    });

    // Force exit if connections do not close in time
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Unhandled promise rejection");
    shutdown("unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });
}

void bootstrap();
