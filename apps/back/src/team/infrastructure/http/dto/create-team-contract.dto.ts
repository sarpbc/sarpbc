import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { ContractRole } from "../../../../player/domain/roster";
export const CreateTeamContractDto = z.strictObject({
  playerId: z.uuid(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  role: z.enum(ContractRole).optional(),
});

export type CreateTeamContractDto = z.infer<typeof CreateTeamContractDto>;
