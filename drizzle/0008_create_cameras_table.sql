CREATE TABLE "cameras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"location" varchar(200),
	"rtsp_url_encrypted" text NOT NULL,
	"stream_path" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cameras_stream_path_format" CHECK ("cameras"."stream_path" ~ '^[a-z0-9][a-z0-9_-]{1,63}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cameras_stream_path_unique" ON "cameras" USING btree ("stream_path");