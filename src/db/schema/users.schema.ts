import { sql } from "drizzle-orm";
import { timestamps } from "./helpers.js";
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    passwordHash: text().notNull(),
    role: userRoleEnum().notNull().default("user"),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
  ],
);

export type UserType = typeof usersTable.$inferSelect;
export type NewUserType = typeof usersTable.$inferInsert;
export type UserRoleType = (typeof userRoleEnum.enumValues)[number];
