import { z } from "zod";

export const MAX_IMAGES_PER_PRODUCT = 8;

// ----------------------------- Product Image Param Schema -----------------------------
// Both ids are checked together, so an image can only be reached through its own product
export const ProductImageParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
  imageId: z.uuid("imageId must be a valid UUID"),
});

export type ProductImageParamSchemaType = z.infer<
  typeof ProductImageParamSchema
>;

// ----------------------------- Reorder Product Images Schema -----------------------------
// The full gallery in the new display order; the first id becomes the cover image
export const ReorderProductImagesSchema = z.object({
  imageIds: z
    .array(z.uuid("every imageId must be a valid UUID"), {
      error: "imageIds must be an array of image ids",
    })
    .min(1, "imageIds must contain at least one image id")
    .max(
      MAX_IMAGES_PER_PRODUCT,
      `imageIds can contain at most ${MAX_IMAGES_PER_PRODUCT} ids`,
    )
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "imageIds must not contain duplicates",
    }),
});

export type ReorderProductImagesSchemaType = z.infer<
  typeof ReorderProductImagesSchema
>;
