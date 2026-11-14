import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { CONTRACT_ROLES } from "@sarpbc/types";

export const UpdateContractDto = z.strictObject({
  endDate: isoDateSchema.nullable().optional(),
  role: z.enum(CONTRACT_ROLES).optional(),
  startDate: isoDateSchema.optional(),
  teamId: z.uuid().optional(),
});

export type UpdateContractInput = z.infer<typeof UpdateContractDto>;
