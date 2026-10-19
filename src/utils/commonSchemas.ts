import { z } from "zod";

// Route params like /categories/:id
export const IdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});
export type IdParamSchemaType = z.infer<typeof IdParamSchema>;

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "slug must be at least 2 characters")
  .max(120, "slug must be at most 120 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "slug may only contain lowercase letters, numbers and single hyphens",
  );

// A search term from the query string; blank means "no search"
export const SearchQuerySchema = z
  .string()
  .trim()
  .max(100, "search must be at most 100 characters")
  .optional()
  .transform((value) => (value ? value : undefined));
