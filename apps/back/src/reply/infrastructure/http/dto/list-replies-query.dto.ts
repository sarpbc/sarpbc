import { REPLY_TARGET_TYPES } from "@sarpbc/types";
import { z } from "zod";
import { PaginationQueryDto } from "../../../../common/infrastructure/http/dto/pagination-query.dto";

export const ListRepliesQueryDto = PaginationQueryDto.extend({
  targetId: z.uuidv4(),
  targetType: z.enum(REPLY_TARGET_TYPES),
});

export type ListRepliesQueryInput = z.infer<typeof ListRepliesQueryDto>;
