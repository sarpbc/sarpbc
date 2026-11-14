import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { CONTRACT_ROLES } from "@sarpbc/types";

export const CreateTeamContractDto = z.strictObject({
  endDate: isoDateSchema.optional(),
  playerId: z.uuid(),
  role: z.enum(CONTRACT_ROLES).optional(),
  startDate: isoDateSchema,
});

export type CreateTeamContractInput = z.infer<typeof CreateTeamContractDto>;
