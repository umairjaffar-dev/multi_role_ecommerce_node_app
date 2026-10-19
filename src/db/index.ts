import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import * as schema from "./schema/index.js";

export const pool = new Pool({
  connectionString: env.db.url,
  max: env.db.poolMax,
  idleTimeoutMillis: 30_000, // close the database connection that is not used for 30s.
  connectionTimeoutMillis: 5_000, // if Pool is full or database is down then after 5s request will be failed, not stucked into pool.
});

// Errors on idle clients (e.g. DB restarted) must not crash the process
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle PostgreSQL client");
});

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
});

export type DatabaseType = typeof db;
// A transaction object exposes the same query API as `db`
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];
// Accept either, so a helper can run standalone or inside a caller's transaction
export type DbExecutorType = DatabaseType | TransactionType;

export async function checkDatabaseConnection(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info("Database pool closed");
}
