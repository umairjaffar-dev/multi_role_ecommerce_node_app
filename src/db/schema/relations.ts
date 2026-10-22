import { relations } from "drizzle-orm";
import { usersTable } from "./users.schema.js";
import { refreshTokensTable } from "./refreshTokens.schema.js";
import { productsTable } from "./products.schema.js";
import { productImagesTable } from "./productImages.schema.js";

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

// relation between product_images and products table.
export const productsRelations = relations(productsTable, ({ many }) => ({
  images: many(productImagesTable),
}));

export const productImagesRelations = relations(
  productImagesTable,
  ({ one }) => ({
    product: one(productsTable, {
      fields: [productImagesTable.productId],
      references: [productsTable.id],
    }),
  }),
);
