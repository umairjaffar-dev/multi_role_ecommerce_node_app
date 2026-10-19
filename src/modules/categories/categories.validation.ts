import { z } from "zod";
import { SearchQuerySchema, SlugSchema } from "../../utils/commonSchemas.js";
import { PaginationQuerySchema } from "../../utils/pagination.js";

const NameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

const DescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description must be at most 1000 characters")
  .nullable();

export const CreateCategorySchema = z.object({
  name: NameSchema,
  slug: SlugSchema.optional(),
  description: DescriptionSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategorySchemaType = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

export type UpdateCategorySchemaType = z.infer<typeof UpdateCategorySchema>;

export const ListCategoriesQuerySchema = PaginationQuerySchema.extend({
  search: SearchQuerySchema,
});

export type ListCategoriesQuerySchemaType = z.infer<
  typeof ListCategoriesQuerySchema
>;

// Admin list can also filter by visibility: ?isActive=true / ?isActive=false
export const AdminListCategoriesQuerySchema = ListCategoriesQuerySchema.extend({
  isActive: z
    .enum(["true", "false"], { error: "isActive must be true or false" })
    .transform((value) => value === "true")
    .optional(),
});

export type AdminListCategoriesQuerySchemaType = z.infer<
  typeof AdminListCategoriesQuerySchema
>;

export const CategorySlugParamSchema = z.object({
  slug: SlugSchema,
});

export type CategorySlugParamSchemaType = z.infer<
  typeof CategorySlugParamSchema
>;
