import { z } from "zod";
import { MAX_PAGE_SIZE } from "@sarpbc/utils";
import { PaginationQueryDto } from "../../../../common/infrastructure/http/dto/pagination-query.dto";

export const ListModerationRepliesQueryDto = PaginationQueryDto.extend({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

export type ListModerationRepliesQueryInput = z.infer<typeof ListModerationRepliesQueryDto>;
