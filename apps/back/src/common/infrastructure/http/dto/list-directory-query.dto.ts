import { z } from "zod";
import { OffsetPaginationQueryDto } from "./offset-pagination-query.dto";

export const ListDirectoryQueryDto = OffsetPaginationQueryDto.extend({
  name: z.string().max(100).optional(),
  start: z.string().max(16).optional(),
});
export type ListDirectoryQueryDto = z.infer<typeof ListDirectoryQueryDto>;
