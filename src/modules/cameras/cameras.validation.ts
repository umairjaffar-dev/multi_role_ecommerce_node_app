import { z } from "zod";
import {
  createBooleanQuerySchema,
  SearchQuerySchema,
} from "../../utils/commonSchemas.js";
import { PaginationQuerySchema } from "../../utils/pagination.js";

const NameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(200, "Name must be at most 100 characters");

const LocationSchema = z
  .string()
  .trim()
  .max(200, "Location must be at most 200 characters")
  .nullable();

// Only rtsp:// and rtsps:// are camera stream addresses; http(s) or file URLs are rejected
const RtspUrlSchema = z
  .url({
    protocol: /^rtsp?$/,
    error: "rtspUrl must be a valid rtsp:// or rtsps:// URL",
  })
  .max(2048, "rtspUrl must be at most 2048 characters");

// Becomes the MediaMTX path name and part of the public HLS URL (/cam1/index.m3u8),
// so it must be URL-safe: lowercase letters, numbers, "_" and "-"
const StreamPathSchema = z
  .string({ error: "streamPath is required" })
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9_-]{1,63}$/,
    "streamPath must be 2-64 characters: lowercase letters, numbers, '_' or '-', starting with a letter or number",
  );

export const CreateCameraSchema = z.object({
  name: NameSchema,
  location: LocationSchema.optional(),
  rtspUrl: RtspUrlSchema,
  streamPath: StreamPathSchema,
  isActive: z.boolean().optional(),
});
export type CreateCameraSchemaType = z.infer<typeof CreateCameraSchema>;

export const UpdateCameraSchema = CreateCameraSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);
export type UpdateCameraSchemaType = z.infer<typeof UpdateCameraSchema>;

// GET /admin/cameras?page=1&limit=20&search=gate&isActive=true
export const ListCamerasQuerySchema = PaginationQuerySchema.extend({
  search: SearchQuerySchema,
  isActive: createBooleanQuerySchema("isActive").optional(),
});
export type ListCamerasQuerySchemaType = z.infer<typeof ListCamerasQuerySchema>;
