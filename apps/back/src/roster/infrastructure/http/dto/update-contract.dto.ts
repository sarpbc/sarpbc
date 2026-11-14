import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { CONTRACT_ROLES } from "@sarpbc/types";

export const UpdateContractDto = z.strictObject({
  teamId: z.uuid().optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.nullable().optional(),
  role: z.enum(CONTRACT_ROLES).optional(),
});

export type UpdateContractDto = z.infer<typeof UpdateContractDto>;
