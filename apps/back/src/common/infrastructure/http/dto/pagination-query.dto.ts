import { z } from "zod";

export const PaginationQueryDto = z.strictObject({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(0).max(100).default(25),
});

export type PaginationQueryDto = z.infer<typeof PaginationQueryDto>;
