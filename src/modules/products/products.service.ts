import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNotNull,
  isNull,
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
  UpdateProductSchemaType,
} from "./products.validation.js";
import {
  buildPaginationMeta,
  getOffset,
  type PaginatedResultType,
} from "../../utils/pagination.js";
import { escapeLikePattern } from "../../utils/sql.js";

const SLUG_UNIQUE_CONSTRAINT = "products_slug_unique";
const CATEGORY_FK_CONSTRAINT = "products_category_id_categories_id_fk";

export type AdminProductListItemType = ProductType & {
  category: Pick<CategoryType, "id" | "name" | "slug">;
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

  const [items, [totalRow]] = await Promise.all([
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

  return { items, meta: buildPaginationMeta(query, totalRow?.total ?? 0) };
}

export async function productGetByIdService(id: string): Promise<ProductType> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) throw productNotFound();

  return product;
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

// ----------------------- Public Routes -----------------------
export async function productGetBySlugPublicService(
  slug: string,
): Promise<PublicProductType> {
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

  return toPublicProduct(row);
}
