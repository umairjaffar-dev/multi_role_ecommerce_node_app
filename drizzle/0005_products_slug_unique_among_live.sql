DROP INDEX "products_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug") WHERE "products"."deleted_at" IS NULL;