import { z } from "zod";
import { NEWS_TYPES } from "@sarpbc/types";
import { PaginationQueryDto } from "../../../../common/infrastructure/http/dto/pagination-query.dto";
export const NewsLocaleQueryDto = z.strictObject({ locale: z.string().max(16).optional() });
export type NewsLocaleQueryDto = z.infer<typeof NewsLocaleQueryDto>;
export const NewsListQueryDto = PaginationQueryDto.extend({
  ...NewsLocaleQueryDto.shape,
  type: z.enum(NEWS_TYPES).optional(),
});
export type NewsListQueryDto = z.infer<typeof NewsListQueryDto>;
