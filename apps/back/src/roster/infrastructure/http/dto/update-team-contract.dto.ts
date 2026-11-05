import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { ContractRole } from "../../../domain/roster";
export const UpdateTeamContractDto = z.strictObject({
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.nullable().optional(),
  role: z.enum(ContractRole).optional(),
});

export type UpdateTeamContractDto = z.infer<typeof UpdateTeamContractDto>;
