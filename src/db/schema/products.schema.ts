import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.schema.js";
import { timestamps } from "./helpers.js";
import { sql } from "drizzle-orm";

export const productsTable = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    // A category with products cannot be deleted (it can still be hidden)
    categoryId: uuid()
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "restrict" }),
    name: varchar({ length: 200 }).notNull(),
    slug: varchar({ length: 220 }).notNull(),
    description: text(),
    // Money is stored as a whole number of paisa: Rs 1,499.50 → 149950 (never a float)
    priceInPaisa: integer().notNull(),
    stock: integer().notNull().default(0),
    // false = hidden from customers (draft / out of season)
    isActive: boolean().notNull().default(true),
    // Set instead of deleting the row, so past orders keep pointing at a real product (Slice 2.3)
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("products_slug_unique")
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("products_category_id_idx").on(table.categoryId),
    // The database itself refuses impossible values, whatever the code does
    check("products_price_non_negative", sql`${table.priceInPaisa} >= 0`),
    check("products_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export type ProductType = typeof productsTable.$inferSelect;
export type NewProductType = typeof productsTable.$inferInsert;
