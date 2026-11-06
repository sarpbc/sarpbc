import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { CONTRACT_ROLES } from "@sarpbc/types";
export const CreateTeamContractDto = z.strictObject({
  playerId: z.uuid(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  role: z.enum(CONTRACT_ROLES).optional(),
});

export type CreateTeamContractDto = z.infer<typeof CreateTeamContractDto>;
