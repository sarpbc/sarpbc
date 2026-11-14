import { SEARCH_TYPES } from "@sarpbc/types";
import { z } from "zod";
import { OffsetPaginationQueryDto } from "../../../../common/infrastructure/http/dto/offset-pagination-query.dto";

export const SearchQueryDto = OffsetPaginationQueryDto.extend({
  q: z.string().max(200).optional(),
  type: z.enum(SEARCH_TYPES).optional(),
});

export type SearchQueryInput = z.infer<typeof SearchQueryDto>;
