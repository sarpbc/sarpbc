import { z } from "zod";
import { OffsetPaginationQueryDto } from "../../../../common/infrastructure/http/dto/offset-pagination-query.dto";
export const SearchQueryDto = OffsetPaginationQueryDto.extend({
  q: z.string().max(200).optional(),
  type: z.enum(["player", "team", "tournament", "all"]).optional(),
});

export type SearchQueryDto = z.infer<typeof SearchQueryDto>;
