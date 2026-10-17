import { z } from "zod";

export const OffsetPaginationQueryDto = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type OffsetPaginationQueryDto = z.infer<typeof OffsetPaginationQueryDto>;
