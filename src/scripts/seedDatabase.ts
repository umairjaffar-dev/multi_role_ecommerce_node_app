// Seeds the development database with users, categories, products and product images.
// Usage: npm run db:seed
//
// Idempotent: rows that already exist (same email / slug) are skipped, so running it twice
// adds nothing new. It refuses to run in production.
import { randomUUID } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import bcrypt from "bcrypt";
import { and, eq, isNull, sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { closeDatabase, db } from "../db/index.js";
import {
  categoriesTable,
  productImagesTable,
  productsTable,
  usersTable,
} from "../db/schema/index.js";
import { storage } from "../lib/storage/index.js";
import { detectImageType } from "../utils/imageType.js";
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_USERS,
  type SeedProductType,
} from "./seedData.js";

const IMAGE_SIZE_PX = 800;
const IMAGE_FETCH_TIMEOUT_MS = 10_000;
const HOUR_MS = 60 * 60 * 1000;

type SeedSummaryType = {
  usersCreated: number;
  categoriesCreated: number;
  productsCreated: number;
  imagesUploaded: number;
  placeholderImages: number;
};

// ----------------------------- Images -----------------------------

// Real photo from picsum.photos; the seed makes the same photo come back every run
async function downloadPhoto(seed: string): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `https://picsum.photos/seed/${encodeURIComponent(seed)}/${IMAGE_SIZE_PX}/${IMAGE_SIZE_PX}.jpg`,
      { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) },
    );
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, checksum]);
}

// Offline fallback: a diagonal two-colour gradient PNG, built with Node's zlib only
function createPlaceholderPng(seedIndex: number): Buffer {
  const size = 400;
  const hue = (seedIndex * 47) % 360;
  const toRgb = (h: number, lightness: number): [number, number, number] => {
    const c = (1 - Math.abs(2 * lightness - 1)) * 0.6;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lightness - c / 2;
    const [r, g, b] =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  };
  const start = toRgb(hue, 0.75);
  const end = toRgb((hue + 40) % 360, 0.45);

  // Each row: filter byte 0, then RGB pixels
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      const offset = rowStart + 1 + x * 3;
      raw[offset] = Math.round(start[0] + (end[0] - start[0]) * t);
      raw[offset + 1] = Math.round(start[1] + (end[1] - start[1]) * t);
      raw[offset + 2] = Math.round(start[2] + (end[2] - start[2]) * t);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Same path as a real upload: check the bytes, store the file, then save the row
async function addProductImages(
  product: SeedProductType,
  productId: string,
  productIndex: number,
  summary: SeedSummaryType,
): Promise<void> {
  for (let sortOrder = 0; sortOrder < product.imageCount; sortOrder++) {
    let body = await downloadPhoto(`${product.slug}-${sortOrder}`);
    if (!body || !detectImageType(body)) {
      body = createPlaceholderPng(productIndex * 3 + sortOrder);
      summary.placeholderImages += 1;
    }

    const imageType = detectImageType(body);
    if (!imageType) throw new Error("Seed image is not a valid JPEG/PNG");

    const key = `products/${productId}/${randomUUID()}.${imageType.extension}`;
    await storage.upload({ key, body, contentType: imageType.mimeType });
    await db.insert(productImagesTable).values({ productId, key, sortOrder });
    summary.imagesUploaded += 1;
  }
}

// ----------------------------- Seed steps -----------------------------

async function seedUsers(summary: SeedSummaryType): Promise<void> {
  for (const seedUser of SEED_USERS) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${seedUser.email.toLowerCase()}`)
      .limit(1);
    if (existing) continue;

    await db.insert(usersTable).values({
      name: seedUser.name,
      email: seedUser.email.toLowerCase(),
      passwordHash: await bcrypt.hash(
        seedUser.password,
        env.security.bcryptSaltRounds,
      ),
      role: seedUser.role,
    });
    summary.usersCreated += 1;
  }
}

async function seedCategories(
  summary: SeedSummaryType,
): Promise<Map<string, string>> {
  const categoryIdsBySlug = new Map<string, string>();

  for (const category of SEED_CATEGORIES) {
    const [existing] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, category.slug))
      .limit(1);

    if (existing) {
      categoryIdsBySlug.set(category.slug, existing.id);
      continue;
    }

    const [created] = await db
      .insert(categoriesTable)
      .values(category)
      .returning({ id: categoriesTable.id });
    if (!created) throw new Error(`Failed to create category ${category.slug}`);

    categoryIdsBySlug.set(category.slug, created.id);
    summary.categoriesCreated += 1;
  }

  return categoryIdsBySlug;
}

async function seedProducts(
  categoryIdsBySlug: Map<string, string>,
  summary: SeedSummaryType,
): Promise<void> {
  const now = Date.now();

  for (const [index, product] of SEED_PRODUCTS.entries()) {
    // Slugs are unique among live products only, so check live ones (and the seeded deleted one)
    const [existing] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        product.isDeleted
          ? eq(productsTable.slug, product.slug)
          : and(
              eq(productsTable.slug, product.slug),
              isNull(productsTable.deletedAt),
            ),
      )
      .limit(1);
    if (existing) continue;

    const categoryId = categoryIdsBySlug.get(product.categorySlug);
    if (!categoryId)
      throw new Error(`Unknown category ${product.categorySlug}`);

    // Spread creation times over the past days so "Newest" sorting shows a real order
    const createdAt = new Date(now - (SEED_PRODUCTS.length - index) * HOUR_MS);

    const [created] = await db
      .insert(productsTable)
      .values({
        categoryId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceInPaisa: product.priceInPaisa,
        stock: product.stock,
        isActive: product.isActive,
        deletedAt: product.isDeleted ? new Date() : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: productsTable.id });
    if (!created) throw new Error(`Failed to create product ${product.slug}`);

    await addProductImages(product, created.id, index, summary);
    summary.productsCreated += 1;
    process.stdout.write(`  ✓ ${product.name}\n`);
  }
}

async function seedDatabase(): Promise<number> {
  if (env.isProduction) {
    console.error("Refusing to seed a production database.");
    return 1;
  }

  // Fail early with a clear message if MinIO/SeaweedFS/S3 is not running
  await storage.checkConnection();

  const summary: SeedSummaryType = {
    usersCreated: 0,
    categoriesCreated: 0,
    productsCreated: 0,
    imagesUploaded: 0,
    placeholderImages: 0,
  };

  console.log("Seeding users…");
  await seedUsers(summary);
  console.log("Seeding categories…");
  const categoryIdsBySlug = await seedCategories(summary);
  console.log(
    "Seeding products and images (downloading photos, this can take a minute)…",
  );
  await seedProducts(categoryIdsBySlug, summary);

  console.log("\nDone:");
  console.table(summary);
  console.log("\nLogin accounts:");
  console.table(
    SEED_USERS.map(({ email, password, role }) => ({ email, password, role })),
  );
  if (summary.placeholderImages > 0) {
    console.log(
      `${summary.placeholderImages} image(s) used a generated placeholder (photo download failed or offline).`,
    );
  }
  return 0;
}

seedDatabase()
  .then(async (exitCode) => {
    await closeDatabase();
    process.exit(exitCode);
  })
  .catch(async (err: unknown) => {
    console.error("Seeding failed:", err);
    await closeDatabase();
    process.exit(1);
  });
