import {
  boolean,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers.js";

export const categoriesTable = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 100 }).notNull(),
    // URL-friendly unique name used in public URLs: /categories/men-shoes
    slug: varchar({ length: 120 }).notNull(),
    description: text(),
    // S3 object key; stays null until the S3 module
    imageKey: text(),
    // Hidden categories stay in the database but are not shown to customers
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export type CategoryType = typeof categoriesTable.$inferSelect;
export type NewCategoryType = typeof categoriesTable.$inferInsert;
