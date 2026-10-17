import { z } from "zod";
import { PaginationQueryDto } from "../../../../common/infrastructure/http/dto/pagination-query.dto";
export const ListNotificationsQueryDto = PaginationQueryDto.extend({
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type ListNotificationsQueryDto = z.infer<typeof ListNotificationsQueryDto>;
