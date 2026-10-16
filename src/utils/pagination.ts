import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be atleast 1").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "limit must be at least 1")
    .max(MAX_PAGE_SIZE, `limit must be at most ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuerySchemaType = z.infer<typeof PaginationQuerySchema>;

export type PaginationMetaType = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResultType<TItem> = {
  items: Array<TItem>;
  meta: PaginationMetaType;
};

export function getOffset({ page, limit }: PaginationQuerySchemaType): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(
  { page, limit }: PaginationQuerySchemaType,
  total: number,
): PaginationMetaType {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
