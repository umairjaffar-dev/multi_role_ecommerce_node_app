import { relations } from "drizzle-orm";
import { usersTable } from "./users.schema.js";
import { refreshTokensTable } from "./refreshTokens.schema.js";

export const usersRelations = relations(usersTable, ({ many }) => ({
  refreshTokens: many(refreshTokensTable),
}));

export const refreshTokensRelations = relations(
  refreshTokensTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [refreshTokensTable.userId],
      references: [usersTable.id],
    }),
  }),
);
