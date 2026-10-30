import { z } from "zod";
import { TRANSFER_TYPES } from "@sarpbc/types";
import { OffsetPaginationQueryDto } from "../../../../common/infrastructure/http/dto/offset-pagination-query.dto";

export const ListTransfersQueryDto = OffsetPaginationQueryDto.extend({
  team: z.string().min(1).max(200).optional(),
  player: z.string().min(1).max(200).optional(),
  type: z.enum(TRANSFER_TYPES).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type ListTransfersQueryDto = z.infer<typeof ListTransfersQueryDto>;
