import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { ContractRole } from "../../../domain/roster";
export const CreateContractDto = z.strictObject({
  teamId: z.uuid(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  role: z.enum(ContractRole).optional(),
});

export type CreateContractDto = z.infer<typeof CreateContractDto>;
