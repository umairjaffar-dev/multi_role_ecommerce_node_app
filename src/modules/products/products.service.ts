import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  categoriesTable,
  productsTable,
  type CategoryType,
  type ProductType,
} from "../../db/schema/index.js";
import { AppError } from "../../utils/AppError.js";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../utils/dbErrors.js";
import { slugify } from "../../utils/slugify.js";
import type {
  AdminListProductsQuerySchemaType,
  CreateProductSchemaType,
  ListProductsQuerySchemaType,
  ProductCursorType,
  ProductSortType,
  RestoreProductSchemaType,
  UpdateProductSchemaType,
} from "./products.validation.js";
import {
  buildPaginationMeta,
  getOffset,
  type PaginatedResultType,
} from "../../utils/pagination.js";
import { escapeLikePattern } from "../../utils/sql.js";
import { encodeCursor } from "../../utils/cursor.js";
import {
  productImageCoverUrlsService,
  productImageListService,
  type ProductGalleryImageType,
} from "../productImages/productImages.service.js";

const SLUG_UNIQUE_CONSTRAINT = "products_slug_unique";
const CATEGORY_FK_CONSTRAINT = "products_category_id_categories_id_fk";

export type AdminProductListItemType = ProductType & {
  category: Pick<CategoryType, "id" | "name" | "slug">;
  imageUrl: string | null; // cover image
};

const adminProductListColumns = {
  ...getTableColumns(productsTable),
  // A nested object in select() comes back as a nested object in each row
  category: {
    id: categoriesTable.id,
    name: categoriesTable.name,
    slug: categoriesTable.slug,
  },
};

export type PublicProductType = Pick<
  ProductType,
  "id" | "name" | "slug" | "description" | "priceInPaisa" | "createdAt"
> & {
  inStock: boolean;
  category: Pick<CategoryType, "name" | "slug">;
};

export type PublicProductListMetaType = {
  limit: number;
  hasNextPage: boolean;
  // Send this back as ?cursor= to get the next page; null on the last page
  nextCursor: string | null;
};

export type PublicProductListItemType = PublicProductType & {
  imageUrl: string | null;
};

export type PublicProductListResultType = {
  items: Array<PublicProductListItemType>;
  meta: PublicProductListMetaType;
};

// Admin edit page: the full row plus the gallery with sortOrder (needed for reordering)
export type AdminProductDetailType = ProductType & {
  images: Array<ProductGalleryImageType>;
};

// Customer product page: the public shape plus the gallery (no internal sortOrder)
export type PublicProductDetailType = PublicProductType & {
  images: Array<Pick<ProductGalleryImageType, "id" | "url">>;
};

// Every sort ends with id, so two products with the same price/date still have a fixed order
const PUBLIC_SORT_ORDER = {
  newest: [desc(productsTable.createdAt), desc(productsTable.id)],
  price_asc: [asc(productsTable.priceInPaisa), asc(productsTable.id)],
  price_desc: [desc(productsTable.priceInPaisa), desc(productsTable.id)],
} satisfies Record<ProductSortType, Array<SQL>>;

const publicProductColumns = {
  id: productsTable.id,
  name: productsTable.name,
  slug: productsTable.slug,
  description: productsTable.description,
  priceInPaisa: productsTable.priceInPaisa,
  createdAt: productsTable.createdAt,
  // Selected only to compute inStock; never sent to the client as a number
  stock: productsTable.stock,
  category: { name: categoriesTable.name, slug: categoriesTable.slug },
};

// A product is visible only if it is active, not deleted, and its category is active too
const isPubliclyVisible = and(
  eq(productsTable.isActive, true),
  isNull(productsTable.deletedAt),
  eq(categoriesTable.isActive, true),
);

// Database row → API shape (DTO). Reused by the public list
function toPublicProduct({
  stock,
  ...product
}: { stock: number } & Omit<PublicProductType, "inStock">): PublicProductType {
  return { ...product, inStock: stock > 0 };
}

function productNotFound(): AppError {
  return new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
}

function mapProductWriteError(error: unknown, slug: string | undefined): never {
  if (slug && isUniqueViolation(error, SLUG_UNIQUE_CONSTRAINT)) {
    throw new AppError(
      409,
      `A product with slug "${slug}" already exists`,
      "PRODUCT_SLUG_EXISTS",
    );
  }

  if (isForeignKeyViolation(error, CATEGORY_FK_CONSTRAINT)) {
    throw new AppError(
      400,
      "categoryId does not match any category",
      "INVALID_CATEGORY_ID",
    );
  }

  throw error;
}

export async function productCreateService(
  input: CreateProductSchemaType,
): Promise<ProductType> {
  const slug = input.slug ?? slugify(input.name);

  if (!slug) {
    throw new AppError(
      400,
      "Name must contain letters or numbers to build a slug",
      "INVALID_PRODUCT_NAME",
    );
  }

  try {
    const [product] = await db
      .insert(productsTable)
      .values({
        categoryId: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        priceInPaisa: input.priceInPaisa,
        slug,
        stock: input.stock ?? 0,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!product) throw new Error("Insert did not return the created product");
    return product;
  } catch (error) {
    mapProductWriteError(error, slug);
  }
}

export async function productListAdminService(
  query: AdminListProductsQuerySchemaType,
): Promise<PaginatedResultType<AdminProductListItemType>> {
  const conditions: Array<SQL> = [];

  if (query.status === "live") conditions.push(isNull(productsTable.deletedAt));
  if (query.status === "deleted") {
    conditions.push(isNotNull(productsTable.deletedAt));
  }
  if (query.search) {
    conditions.push(
      ilike(productsTable.name, `%${escapeLikePattern(query.search)}%`),
    );
  }
  if (query.categoryId) {
    conditions.push(eq(productsTable.categoryId, query.categoryId));
  }

  if (query.isActive !== undefined) {
    conditions.push(eq(productsTable.isActive, query.isActive));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select(adminProductListColumns)
      .from(productsTable)
      // Every product has a category (NOT NULL foreign key), so an inner join never drops a row
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .where(where)
      // Newest first; id breaks ties so rows never jump between pages
      .orderBy(desc(productsTable.createdAt), desc(productsTable.id))
      .limit(query.limit)
      .offset(getOffset(query)),
    // Filters only touch product columns, so the count does not need the join
    db.select({ total: count() }).from(productsTable).where(where),
  ]);

  const coverUrls = await productImageCoverUrlsService(
    rows.map((row) => row.id),
  );

  const items = rows.map((row) => ({
    ...row,
    imageUrl: coverUrls.get(row.id) ?? null,
  }));

  return { items, meta: buildPaginationMeta(query, totalRow?.total ?? 0) };
}

export async function productGetByIdService(
  id: string,
): Promise<AdminProductDetailType> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) throw productNotFound();

  const images = await productImageListService(product.id);

  return { ...product, images };
}

// Update product.
export async function productUpdateService(
  id: string,
  input: UpdateProductSchemaType,
): Promise<ProductType> {
  try {
    const [product] = await db
      .update(productsTable)
      // undefined fields are skipped by Drizzle, so only the sent fields change.
      // The slug is NOT rebuilt when the name changes: existing product URLs must keep working.
      .set({
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        priceInPaisa: input.priceInPaisa,
        stock: input.stock,
        isActive: input.isActive,
      })
      .where(and(eq(productsTable.id, id), isNull(productsTable.deletedAt)))
      .returning();

    if (!product) throw productNotFound();

    return product;
  } catch (error) {
    mapProductWriteError(error, input.slug);
  }
}

// Soft delete product.
export async function productDeleteService(id: string): Promise<void> {
  const [deleted] = await db
    .update(productsTable)
    .set({
      deletedAt: new Date(),
    })
    // Already deleted → 404, and the original deletedAt is not overwritten
    .where(and(eq(productsTable.id, id), isNull(productsTable.deletedAt)))
    .returning({ id: productsTable.id });

  if (!deleted) throw productNotFound();
}

// Undo a soft delete. Images were never removed, so the product comes back exactly as it was
export async function productRestoreService(
  id: string,
  input: RestoreProductSchemaType,
): Promise<AdminProductDetailType> {
  try {
    const [restored] = await db
      .update(productsTable)
      // undefined slug is skipped by Drizzle, so the old slug is kept unless a new one is sent
      .set({ deletedAt: null, slug: input.slug })
      .where(and(eq(productsTable.id, id), isNotNull(productsTable.deletedAt)))
      .returning({ id: productsTable.id });

    if (!restored) {
      // Nothing changed: tell "does not exist" apart from "is not deleted"
      const [existing] = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.id, id))
        .limit(1);
      if (!existing) throw productNotFound();
      throw new AppError(409, "Product is not deleted", "PRODUCT_NOT_DELETED");
    }
  } catch (error) {
    // The slug is unique only among live products, so a live product may have taken it
    if (isUniqueViolation(error, SLUG_UNIQUE_CONSTRAINT)) {
      throw new AppError(
        409,
        "A live product already uses this slug. Send a new slug in the request body to restore it",
        "PRODUCT_SLUG_EXISTS",
      );
    }
    throw error;
  }

  return productGetByIdService(id);
}

// ----------------------- Public Routes -----------------------
// created_at as UTC text with all 6 microsecond digits, e.g. 2026-10-19T10:11:22.817123Z.
// Postgres stores microseconds; a JS Date keeps only milliseconds, so a Date-based cursor would skip rows.
const createdAtCursorValue = sql<string>`to_char(${productsTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

// Keyset condition: "rows that come after the cursor row in this sort order".
// (a, b) > (x, y) is a row comparison: a > x, or a = x and b > y. The id settles ties.
function buildAfterCursorCondition(cursor: ProductCursorType): SQL {
  switch (cursor.sort) {
    case "newest":
      return sql`(${productsTable.createdAt}, ${productsTable.id}) < (${cursor.value}::timestamptz, ${cursor.id}::uuid)`;
    case "price_asc":
      return sql`(${productsTable.priceInPaisa}, ${productsTable.id}) > (${cursor.value}, ${cursor.id}::uuid)`;
    case "price_desc":
      return sql`(${productsTable.priceInPaisa}, ${productsTable.id}) < (${cursor.value}, ${cursor.id}::uuid)`;
  }
}

function buildNextCursor(
  sort: ProductSortType,
  lastRow: { id: string; priceInPaisa: number; createdAtCursor: string },
): string {
  // Narrowing on sort lets TypeScript check that each sort carries the right value type
  const cursor: ProductCursorType =
    sort === "newest"
      ? { sort, value: lastRow.createdAtCursor, id: lastRow.id }
      : { sort, value: lastRow.priceInPaisa, id: lastRow.id };

  return encodeCursor(cursor);
}

export async function productListPublicService(
  query: ListProductsQuerySchemaType,
): Promise<PublicProductListResultType> {
  const conditions: Array<SQL> = [];

  if (query.category) {
    conditions.push(eq(categoriesTable.slug, query.category));
  }
  if (query.minPrice !== undefined) {
    conditions.push(gte(productsTable.priceInPaisa, query.minPrice));
  }
  if (query.maxPrice !== undefined) {
    conditions.push(lte(productsTable.priceInPaisa, query.maxPrice));
  }
  if (query.inStock !== undefined) {
    conditions.push(
      query.inStock ? gt(productsTable.stock, 0) : eq(productsTable.stock, 0),
    );
  }
  if (query.search) {
    conditions.push(
      ilike(productsTable.name, `%${escapeLikePattern(query.search)}%`),
    );
  }
  if (query.cursor) {
    conditions.push(buildAfterCursorCondition(query.cursor));
  }

  const rows = await db
    .select({ ...publicProductColumns, createdAtCursor: createdAtCursorValue })
    .from(productsTable)
    .innerJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.id),
    )
    // The visibility rule is always applied first; filters can only narrow it down
    .where(and(isPubliclyVisible, ...conditions))
    .orderBy(...PUBLIC_SORT_ORDER[query.sort])
    // One extra row tells us whether another page exists, without a COUNT query
    .limit(query.limit + 1);

  const hasNextPage = rows.length > query.limit;
  const pageRows = hasNextPage ? rows.slice(0, query.limit) : rows;

  // The next page starts right after the last row of this page
  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasNextPage && lastRow ? buildNextCursor(query.sort, lastRow) : null;

  // One extra query for the whole page's cover images (not one per product)
  const coverUrls = await productImageCoverUrlsService(
    pageRows.map((row) => row.id),
  );

  return {
    items: pageRows.map(({ createdAtCursor: _createdAtCursor, ...row }) => ({
      ...toPublicProduct(row),
      imageUrl: coverUrls.get(row.id) ?? null,
    })),
    meta: { limit: query.limit, hasNextPage, nextCursor },
  };
}

export async function productGetBySlugPublicService(
  slug: string,
): Promise<PublicProductDetailType> {
  const [row] = await db
    .select(publicProductColumns)
    .from(productsTable)
    .innerJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.id),
    )
    .where(and(eq(productsTable.slug, slug), isPubliclyVisible))
    .limit(1);

  // Hidden, deleted and missing all look the same to a customer: 404, never 403
  if (!row) throw productNotFound();

  const images = await productImageListService(row.id);

  return {
    ...toPublicProduct(row),
    // Customers get id + url only; sortOrder is an admin concern
    images: images.map(({ id, url }) => ({ id, url })),
  };
}
