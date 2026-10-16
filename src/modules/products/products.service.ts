import { db } from "../../db/index.js";
import { productsTable, type ProductType } from "../../db/schema/index.js";
import { AppError } from "../../utils/AppError.js";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../utils/dbErrors.js";
import { slugify } from "../../utils/slugify.js";
import type { CreateProductSchemaType } from "./products.validation.js";

const SLUG_UNIQUE_CONSTRAINT = "products_slug_unique";
const CATEGORY_FK_CONSTRAINT = "products_category_id_categories_id_fk";

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
    // Business rule 3: slugs are unique across all products
    if (isUniqueViolation(error, SLUG_UNIQUE_CONSTRAINT)) {
      throw new AppError(
        409,
        `A product with slug "${slug}" already exists`,
        "PRODUCT_SLUG_EXISTS",
      );
    }
    // Business rule 4: the category must exist; the foreign key checks it for us
    if (isForeignKeyViolation(error, CATEGORY_FK_CONSTRAINT)) {
      throw new AppError(
        400,
        "categoryId does not match any category",
        "INVALID_CATEGORY_ID",
      );
    }
    throw error;
  }
}
