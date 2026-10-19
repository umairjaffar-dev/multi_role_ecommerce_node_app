import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productsTable, type ProductType } from "../../db/schema/index.js";
import { AppError } from "../../utils/AppError.js";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../utils/dbErrors.js";
import { slugify } from "../../utils/slugify.js";
import type {
  CreateProductSchemaType,
  UpdateProductSchemaType,
} from "./products.validation.js";

const SLUG_UNIQUE_CONSTRAINT = "products_slug_unique";
const CATEGORY_FK_CONSTRAINT = "products_category_id_categories_id_fk";

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

export async function productGetByIdService(id: string): Promise<ProductType> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) throw productNotFound();

  return product;
}
export async function productUpdateService(
  id: string,
  input: UpdateProductSchemaType,
): Promise<ProductType> {
  try {
    const [product] = await db
      .update(productsTable)
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
