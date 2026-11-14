import { z } from "zod";
import { MAX_PAGE_SIZE } from "@sarpbc/utils";

export const OffsetPaginationQueryDto = z.strictObject({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type OffsetPaginationQueryInput = z.infer<typeof OffsetPaginationQueryDto>;
