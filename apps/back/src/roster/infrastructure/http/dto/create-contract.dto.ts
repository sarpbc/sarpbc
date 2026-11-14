import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { CONTRACT_ROLES } from "@sarpbc/types";

export const CreateContractDto = z.strictObject({
  endDate: isoDateSchema.optional(),
  role: z.enum(CONTRACT_ROLES).optional(),
  startDate: isoDateSchema,
  teamId: z.uuid(),
});

export type CreateContractInput = z.infer<typeof CreateContractDto>;
