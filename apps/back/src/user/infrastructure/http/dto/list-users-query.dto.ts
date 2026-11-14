import { z } from "zod";
import { OffsetPaginationQueryDto } from "../../../../common/infrastructure/http/dto/offset-pagination-query.dto";

export const ListUsersQueryDto = OffsetPaginationQueryDto.extend({
  search: z.string().trim().max(100).optional(),
});

export type ListUsersQueryInput = z.infer<typeof ListUsersQueryDto>;
