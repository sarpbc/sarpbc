import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { CONTRACT_ROLES } from "@sarpbc/types";

export const UpdateTeamContractDto = z.strictObject({
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.nullable().optional(),
  role: z.enum(CONTRACT_ROLES).optional(),
});

export type UpdateTeamContractInput = z.infer<typeof UpdateTeamContractDto>;
