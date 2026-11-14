import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { CONTRACT_ROLES } from "@sarpbc/types";

export const CreateContractDto = z.strictObject({
  teamId: z.uuid(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  role: z.enum(CONTRACT_ROLES).optional(),
});

export type CreateContractInput = z.infer<typeof CreateContractDto>;
