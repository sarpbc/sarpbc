import { z } from "zod";
import { PaginationQueryDto } from "../../../../common/infrastructure/http/dto/pagination-query.dto";
export const ListModerationRepliesQueryDto = PaginationQueryDto.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListModerationRepliesQueryDto = z.infer<typeof ListModerationRepliesQueryDto>;
