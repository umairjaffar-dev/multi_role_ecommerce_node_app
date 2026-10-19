import { z } from "zod";
import {
  createBooleanQuerySchema,
  SearchQuerySchema,
  SlugSchema,
} from "../../utils/commonSchemas.js";
import { PaginationQuerySchema } from "../../utils/pagination.js";

const MAX_PRICE_IN_PAISA = 1_000_000_000;
const MAX_STOCK = 1_000_000;

// ----------------------------- Create Product Schema -----------------------------
export const CreateProductSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must be at most 200 characters"),
  slug: SlugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be at most 5000 characters")
    .nullable()
    .optional(),
  categoryId: z.uuid("categoryId must be a valid UUID"),
  priceInPaisa: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? "priceInPaisa is required"
          : "priceInPaisa must be a number",
    })
    .int("priceInPaisa must be a whole number of paisa (Rs 1,499.50 → 149950)")
    .min(0, "priceInPaisa cannot be negative")
    .max(
      MAX_PRICE_IN_PAISA,
      `priceInPaisa must be at most ${MAX_PRICE_IN_PAISA}`,
    ),
  stock: z
    .number()
    .int("stock must be a whole number")
    .min(0, "stock cannot be negative")
    .max(MAX_STOCK, `stock must be at most ${MAX_STOCK}`)
    .optional(),
  isActive: z.boolean().optional(),
});

// ----------------------------- Admin List Products Query Schema -----------------------------
// live = not deleted (default), deleted = only soft-deleted, all = both
export const PRODUCT_STATUSES = ["live", "deleted", "all"] as const;

export const AdminListProductsQuerySchema = PaginationQuerySchema.extend({
  search: SearchQuerySchema,
  categoryId: z.uuid("categoryId must be a valid UUID").optional(),
  isActive: createBooleanQuerySchema("isActive").optional(),
  status: z
    .enum(PRODUCT_STATUSES, {
      error: `status must be one of: ${PRODUCT_STATUSES.join(", ")}`,
    })
    .default("live"),
});

export type AdminListProductsQuerySchemaType = z.infer<
  typeof AdminListProductsQuerySchema
>;

export type CreateProductSchemaType = z.infer<typeof CreateProductSchema>;

// ----------------------------- Update Product Schema -----------------------------
export const UpdateProductSchema = CreateProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

export type UpdateProductSchemaType = z.infer<typeof UpdateProductSchema>;
