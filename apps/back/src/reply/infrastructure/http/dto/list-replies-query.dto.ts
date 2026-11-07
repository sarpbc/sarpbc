import { REPLY_TARGET_TYPES } from "@sarpbc/types";
import { z } from "zod";
import { PaginationQueryDto } from "../../../../common/infrastructure/http/dto/pagination-query.dto";
export const ListRepliesQueryDto = PaginationQueryDto.extend({
  targetType: z.enum(REPLY_TARGET_TYPES),
  targetId: z.uuidv4(),
});

export type ListRepliesQueryDto = z.infer<typeof ListRepliesQueryDto>;
