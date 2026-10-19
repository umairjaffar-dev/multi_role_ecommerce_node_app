import { and, asc, count, eq, ilike, type SQL } from "drizzle-orm";
import {
  categoriesTable,
  type CategoryType,
} from "../../db/schema/categories.schema.js";
import { AppError } from "../../utils/AppError.js";
import {
  buildPaginationMeta,
  getOffset,
  type PaginatedResultType,
} from "../../utils/pagination.js";
import type {
  AdminListCategoriesQuerySchemaType,
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "./categories.validation.js";
import { escapeLikePattern } from "../../utils/sql.js";
import { db } from "../../db/index.js";
import { slugify } from "../../utils/slugify.js";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../utils/dbErrors.js";

const SLUG_UNIQUE_CONSTRAINT = "categories_slug_unique";

function categoryNotFound(): AppError {
  return new AppError(404, "Category not found", "CATEGORY_NOT_FOUND");
}

function slugTaken(slug: string): AppError {
  return new AppError(
    409,
    `A category with slug "${slug}" already exists`,
    "CATEGORY_SLUG_EXISTS",
  );
}

// Get all categories from database:
export async function categoryListService(
  query: AdminListCategoriesQuerySchemaType,
): Promise<PaginatedResultType<CategoryType>> {
  const conditions: Array<SQL> = [];

  if (query.search) {
    conditions.push(
      ilike(categoriesTable.name, `%${escapeLikePattern(query.search)}%`),
    );
  }
  if (query.isActive !== undefined) {
    conditions.push(eq(categoriesTable.isActive, query.isActive));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  // The page of rows and the total count are independent, so run them in parallel
  const [items, [totalRow]] = await Promise.all([
    db
      .select()
      .from(categoriesTable)
      .where(where)
      // id as a tie-breaker keeps the order stable when two names are equal
      .orderBy(asc(categoriesTable.name), asc(categoriesTable.id))
      .limit(query.limit)
      .offset(getOffset(query)),
    db.select({ total: count() }).from(categoriesTable).where(where),
  ]);

  return { items, meta: buildPaginationMeta(query, totalRow?.total ?? 0) };
}

// Get category by slug.
export async function categoryGetBySlugService(
  slug: string,
): Promise<CategoryType> {
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(
      and(eq(categoriesTable.slug, slug), eq(categoriesTable.isActive, true)),
    )
    .limit(1);

  if (!category) throw categoryNotFound();
  return category;
}

// Get category by id.
export async function categoryGetByIdService(
  id: string,
): Promise<CategoryType> {
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);

  if (!category) throw categoryNotFound();
  return category;
}

// Create a new category.
export async function categoryCreateService(
  input: CreateCategorySchemaType,
): Promise<CategoryType> {
  const slug = input.slug ?? slugify(input.name);

  if (!slug) {
    throw new AppError(
      400,
      "Name must contain letters or numbers to build a slug",
      "INVALID_CATEGORY_NAME",
    );
  }

  try {
    const [category] = await db
      .insert(categoriesTable)
      .values({
        name: input.name,
        slug,
        description: input.description,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!category)
      throw new Error("Insert did not return the created category");
    return category;
  } catch (error) {
    if (isUniqueViolation(error, SLUG_UNIQUE_CONSTRAINT)) throw slugTaken(slug);
    throw error;
  }
}

// Update category.
export async function categoryUpdateService(
  id: string,
  input: UpdateCategorySchemaType,
): Promise<CategoryType> {
  try {
    const [category] = await db
      .update(categoriesTable)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        isActive: input.isActive,
      })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!category) throw categoryNotFound();

    return category;
  } catch (error) {
    if (input.slug && isUniqueViolation(error, SLUG_UNIQUE_CONSTRAINT))
      throw slugTaken(input.slug);
    throw error;
  }
}

// Delete the category
export async function categoryDeleteService(id: string): Promise<void> {
  try {
    const [deleted] = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .returning({ id: categoriesTable.id });

    if (!deleted) throw categoryNotFound();
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new AppError(
        409,
        "Category still has products. Move or delete them first, or hide the category instead.",
        "CATEGORY_IN_USE",
      );
    }

    throw error;
  }
}
