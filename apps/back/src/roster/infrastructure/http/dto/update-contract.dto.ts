import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { ContractRole } from "../../../domain/roster";
export const UpdateContractDto = z.strictObject({
  teamId: z.uuid().optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.nullable().optional(),
  role: z.enum(ContractRole).optional(),
});

export type UpdateContractDto = z.infer<typeof UpdateContractDto>;
