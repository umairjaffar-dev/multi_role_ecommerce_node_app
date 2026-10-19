import { z } from "zod";
import {
  createBooleanQuerySchema,
  SearchQuerySchema,
  SlugSchema,
} from "../../utils/commonSchemas.js";
import { PaginationQuerySchema } from "../../utils/pagination.js";
import { decodeCursor } from "../../utils/cursor.js";

const MAX_PRICE_IN_PAISA = 1_000_000_000;
const MAX_STOCK = 1_000_000;
const MAX_CURSOR_LENGTH = 300;

// What a product cursor carries: the sort it belongs to, the last row's sort value, and its id.
// newest uses a UTC timestamp string with microseconds (a JS Date would cut it to milliseconds).
const CURSOR_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

const ProductCursorSchema = z.discriminatedUnion("sort", [
  z.object({
    sort: z.literal("newest"),
    value: z.string().regex(CURSOR_TIMESTAMP_REGEX),
    id: z.uuid(),
  }),
  z.object({
    sort: z.literal(["price_asc", "price_desc"]),
    value: z.number().int().min(0),
    id: z.uuid(),
  }),
]);

export type ProductCursorType = z.infer<typeof ProductCursorSchema>;

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

export type CreateProductSchemaType = z.infer<typeof CreateProductSchema>;

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

// ----------------------------- Update Product Schema -----------------------------
export const UpdateProductSchema = CreateProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

export type UpdateProductSchemaType = z.infer<typeof UpdateProductSchema>;

// ----------------------------- Public Product Slug Param Schema -----------------------------
export const ProductSlugParamSchema = z.object({
  slug: SlugSchema,
});

export type ProductSlugParamSchemaType = z.infer<typeof ProductSlugParamSchema>;

// ----------------------------- Public List Products Query Schema -----------------------------
export const PRODUCT_SORTS = ["newest", "price_asc", "price_desc"] as const;
export type ProductSortType = (typeof PRODUCT_SORTS)[number];

const PUBLIC_DEFAULT_PAGE_SIZE = 20;
const PUBLIC_MAX_PAGE_SIZE = 50;

// Query values arrive as text ("150000"), so they are coerced to numbers
function createPriceQuerySchema(field: string) {
  return z.coerce
    .number({ error: `${field} must be a number` })
    .int(`${field} must be a whole number of paisa`)
    .min(0, `${field} cannot be negative`)
    .max(MAX_PRICE_IN_PAISA, `${field} must be at most ${MAX_PRICE_IN_PAISA}`)
    .optional();
}

export const ListProductsQuerySchema = z
  .object({
    category: SlugSchema.optional(),
    minPrice: createPriceQuerySchema("minPrice"),
    maxPrice: createPriceQuerySchema("maxPrice"),
    search: SearchQuerySchema,
    sort: z
      .enum(PRODUCT_SORTS, {
        error: `sort must be one of: ${PRODUCT_SORTS.join(", ")}`,
      })
      .default("newest"),
    limit: z.coerce
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(
        PUBLIC_MAX_PAGE_SIZE,
        `limit must be at most ${PUBLIC_MAX_PAGE_SIZE}`,
      )
      .default(PUBLIC_DEFAULT_PAGE_SIZE),
    cursor: z
      .string()
      .max(MAX_CURSOR_LENGTH, { error: "cursor is invalid", abort: true })
      .transform((value, ctx) => {
        const cursor = decodeCursor(value, ProductCursorSchema);
        if (!cursor) {
          ctx.addIssue({ code: "custom", message: "cursor is invalid" });
          return z.NEVER;
        }
        return cursor;
      })
      .optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    },
  )
  // A price cursor means nothing in a "newest" list, so a changed sort must start from page 1
  .refine((query) => !query.cursor || query.cursor.sort === query.sort, {
    message: "cursor belongs to a different sort; request the first page again",
    path: ["cursor"],
  });

export type ListProductsQuerySchemaType = z.infer<
  typeof ListProductsQuerySchema
>;
