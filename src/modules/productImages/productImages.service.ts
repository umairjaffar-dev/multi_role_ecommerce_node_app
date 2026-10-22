import { randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, isNull, max } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productImagesTable, productsTable } from "../../db/schema/index.js";
import { logger } from "../../lib/logger.js";
import { storage } from "../../lib/storage/index.js";
import { AppError } from "../../utils/AppError.js";
import { detectImageType } from "../../utils/imageType.js";
import { MAX_IMAGES_PER_PRODUCT } from "./productImages.validation.js";

// What the API returns for an image: never the raw storage key alone, always a usable URL
export type ProductImageType = {
  id: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
};

export type UploadedImageFileType = {
  buffer: Buffer;
};

const productImagesLogger = logger.child({ module: "productImages" });

function productNotFound(): AppError {
  return new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
}

function imageLimitReached(): AppError {
  return new AppError(
    409,
    `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images`,
    "PRODUCT_IMAGE_LIMIT_REACHED",
  );
}

// Cheap checks before spending time on an upload; the transaction below re-checks under a lock
async function assertProductCanTakeImage(productId: string): Promise<void> {
  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(eq(productsTable.id, productId), isNull(productsTable.deletedAt)),
    )
    .limit(1);
  if (!product) throw productNotFound();

  const [row] = await db
    .select({ total: count() })
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, productId));
  if ((row?.total ?? 0) >= MAX_IMAGES_PER_PRODUCT) throw imageLimitReached();
}

export async function productImageUploadService(
  productId: string,
  file: UploadedImageFileType | undefined,
): Promise<ProductImageType> {
  // 1. Check
  if (!file) {
    throw new AppError(
      400,
      'Attach an image in the "image" form field',
      "IMAGE_REQUIRED",
    );
  }
  const imageType = detectImageType(file.buffer);
  if (!imageType) {
    throw new AppError(
      415,
      "Only JPEG, PNG and WebP images are allowed",
      "UNSUPPORTED_IMAGE_TYPE",
    );
  }
  await assertProductCanTakeImage(productId);

  // 2. Name: our own random key; the client's file name is never used
  const key = `products/${productId}/${randomUUID()}.${imageType.extension}`;

  // 3. Put: bytes go to storage first
  await storage.upload({
    key,
    body: file.buffer,
    contentType: imageType.mimeType,
  });

  // 4. Save: the row only exists if the file exists
  try {
    const image = await db.transaction(async (tx) => {
      // Locking the product row makes parallel uploads for the same product wait in line,
      // so two requests cannot both see "7 images" and end up with 9
      const [product] = await tx
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(
          and(eq(productsTable.id, productId), isNull(productsTable.deletedAt)),
        )
        .for("update");
      if (!product) throw productNotFound();

      const [stats] = await tx
        .select({
          total: count(),
          lastSortOrder: max(productImagesTable.sortOrder),
        })
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, productId));

      if ((stats?.total ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
        throw imageLimitReached();
      }

      const [inserted] = await tx
        .insert(productImagesTable)
        .values({
          productId,
          key,
          sortOrder: (stats?.lastSortOrder ?? -1) + 1,
        })
        .returning();

      if (!inserted) throw new Error("Insert did not return the image row");
      return inserted;
    });

    // 5. Reply with a URL the client can show right away
    return {
      id: image.id,
      url: await storage.getUrl(image.key),
      sortOrder: image.sortOrder,
      createdAt: image.createdAt,
    };
  } catch (error) {
    // Compensation: the row was not saved, so remove the file we just stored
    await storage.delete(key).catch((deleteError: unknown) => {
      productImagesLogger.error(
        { err: deleteError, key },
        "Failed to remove an orphan image after a failed insert",
      );
    });
    throw error;
  }
}

// Cover image URL (lowest sortOrder) for many products at once: one query for the whole page,
// never one query per product (the N+1 problem). Products without images are simply absent.
export async function productImageCoverUrlsService(
  productIds: Array<string>,
): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();

  // DISTINCT ON keeps only the first row per product_id, in ORDER BY order,
  // so each product gets exactly its lowest-sortOrder image
  const covers = await db
    .selectDistinctOn([productImagesTable.productId], {
      productId: productImagesTable.productId,
      key: productImagesTable.key,
    })
    .from(productImagesTable)
    .where(inArray(productImagesTable.productId, productIds))
    .orderBy(
      productImagesTable.productId,
      asc(productImagesTable.sortOrder),
      asc(productImagesTable.id),
    );

  // Signing a URL is local crypto (no network call), so doing it per image is cheap
  const entries = await Promise.all(
    covers.map(
      async (cover) =>
        [cover.productId, await storage.getUrl(cover.key)] as const,
    ),
  );
  return new Map(entries);
}

// One product's gallery, in display order (index 0 = cover)
export type ProductGalleryImageType = {
  id: string;
  url: string;
  sortOrder: number;
};

// A single product page needs only one query here, so there is no N+1 risk
export async function productImageListService(
  productId: string,
): Promise<Array<ProductGalleryImageType>> {
  const rows = await db
    .select({
      id: productImagesTable.id,
      key: productImagesTable.key,
      sortOrder: productImagesTable.sortOrder,
    })
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, productId))
    // id breaks ties, so the order is stable even if two images share a sortOrder
    .orderBy(asc(productImagesTable.sortOrder), asc(productImagesTable.id));

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      url: await storage.getUrl(row.key),
      sortOrder: row.sortOrder,
    })),
  );
}

function productImageNotFound(): AppError {
  return new AppError(
    404,
    "Product image not found",
    "PRODUCT_IMAGE_NOT_FOUND",
  );
}

// Delete is the mirror of upload: row first, file second.
// If removing the file fails, the image is already gone from the site; only an orphan file is left.
export async function productImageDeleteService(
  productId: string,
  imageId: string,
): Promise<void> {
  const [deleted] = await db
    .delete(productImagesTable)
    // Matching the product too stops /products/A/images/<image of B> (IDOR)
    .where(
      and(
        eq(productImagesTable.id, imageId),
        eq(productImagesTable.productId, productId),
      ),
    )
    .returning({ key: productImagesTable.key });

  if (!deleted) throw productImageNotFound();

  try {
    await storage.delete(deleted.key);
  } catch (err) {
    productImagesLogger.error(
      { err, key: deleted.key },
      "Image row deleted but its file could not be removed (orphan file)",
    );
  }
}

// Sets the whole gallery order at once; imageIds[0] becomes the cover image
export async function productImageReorderService(
  productId: string,
  imageIds: Array<string>,
): Promise<Array<ProductGalleryImageType>> {
  await db.transaction(async (tx) => {
    // Same lock as upload: an upload cannot slip in between our check and our updates
    const [product] = await tx
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(eq(productsTable.id, productId), isNull(productsTable.deletedAt)),
      )
      .for("update");
    if (!product) throw productNotFound();

    const current = await tx
      .select({ id: productImagesTable.id })
      .from(productImagesTable)
      .where(eq(productImagesTable.productId, productId));

    // The list must be exactly this product's images: none missing, none foreign
    const currentIds = new Set(current.map((row) => row.id));
    const isSameSet =
      imageIds.length === currentIds.size &&
      imageIds.every((id) => currentIds.has(id));
    if (!isSameSet) {
      throw new AppError(
        400,
        "imageIds must list every image of this product exactly once",
        "IMAGE_ORDER_MISMATCH",
        { expectedCount: currentIds.size, receivedCount: imageIds.length },
      );
    }

    // At most 8 small updates inside one transaction: either all change or none do
    for (const [index, imageId] of imageIds.entries()) {
      await tx
        .update(productImagesTable)
        .set({ sortOrder: index })
        .where(
          and(
            eq(productImagesTable.id, imageId),
            eq(productImagesTable.productId, productId),
          ),
        );
    }
  });

  return productImageListService(productId);
}
