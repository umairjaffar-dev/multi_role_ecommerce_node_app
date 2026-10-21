import {
  index,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products.schema.js";
import { timestamps } from "./helpers.js";

export const productImagesTable = pgTable(
  "product_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    // Object key in storage, e.g. products/<productId>/<uuid>.webp (never a full URL)
    key: varchar({ length: 300 }).notNull(),
    // Display order; the lowest one is the cover image.
    sortOrder: integer().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("product_images_key_unique").on(table.key),
    index("product_images_product_id_sort_order_idx").on(
      table.productId,
      table.sortOrder,
    ),
  ],
);

export type ProductImageRowType = typeof productImagesTable.$inferSelect;
