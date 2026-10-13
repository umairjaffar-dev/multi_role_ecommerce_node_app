import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

export const refreshTokensTable = pgTable(
  "refresh_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // SHA-256 hex digest of the token (always 64 characters); the raw token is never stored
    tokenHash: varchar({ length: 64 }).notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    // NULL = active; set when the token is rotated or the user logs out
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every refresh request looks a token up by its hash
    uniqueIndex("refresh_tokens_token_hash_unique").on(table.tokenHash),
    // Postgres does not index foreign keys automatically; needed for "revoke all tokens of a user"
    index("refresh_tokens_user_id_idx").on(table.userId),
  ],
);

export type RefreshTokenType = typeof refreshTokensTable.$inferSelect;
export type NewRefreshTokenType = typeof refreshTokensTable.$inferInsert;
