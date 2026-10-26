import {
  boolean,
  check,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers.js";
import { sql } from "drizzle-orm";

export const camerasTable = pgTable(
  "cameras",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 100 }).notNull(),
    location: varchar({ length: 200 }),
    // AES-256-GCM payload "v1:iv:authTag:cipherText" (see lib/encryption.ts).
    // Never return this column or its decrypted value in API responses.
    rtspUrlEncrypted: text().notNull(),
    // MediaMTX path name: rtsp://<server>:8554/<streamPath>, /<streamPath>/index.m3u8
    streamPath: varchar({ length: 64 }).notNull(),
    // false = camera kept but not streamed or analysed
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (table) => [
    // Two cameras on one path would mix their video; the index also closes the race
    // between two concurrent inserts that both passed the "is it free?" check
    uniqueIndex("cameras_stream_path_unique").on(table.streamPath),
    // Same rule as StreamPathSchema, enforced even if a script bypasses validation
    check(
      "cameras_stream_path_format",
      sql`${table.streamPath} ~ '^[a-z0-9][a-z0-9_-]{1,63}$'`,
    ),
  ],
);

export type CameraType = typeof camerasTable.$inferSelect;
export type NewCameraType = typeof camerasTable.$inferInsert;
