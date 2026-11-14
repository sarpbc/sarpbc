import { z } from "zod";
import { MAX_PAGE_SIZE } from "@sarpbc/utils";

export const PaginationQueryDto = z.strictObject({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(0).max(MAX_PAGE_SIZE).default(25),
});

export type PaginationQueryInput = z.infer<typeof PaginationQueryDto>;
