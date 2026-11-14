import { z } from "zod";
import { TRANSFER_TYPES } from "@sarpbc/types";
import { OffsetPaginationQueryDto } from "../../../../common/infrastructure/http/dto/offset-pagination-query.dto";

export const ListTransfersQueryDto = OffsetPaginationQueryDto.extend({
  from: z.iso.date().optional(),
  player: z.string().min(1).max(200).optional(),
  team: z.string().min(1).max(200).optional(),
  to: z.iso.date().optional(),
  type: z.enum(TRANSFER_TYPES).optional(),
});

export type ListTransfersQueryInput = z.infer<typeof ListTransfersQueryDto>;
