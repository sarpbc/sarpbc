import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
export const UpdatePlayerDto = z.strictObject({
  name: z.string().optional(),
  teamId: z.uuid().nullable().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthday: isoDateSchema.optional(),
  nationality: z.string().optional(),
  imageUrl: z.string().optional(),
  slug: z.string().optional(),
});

export type UpdatePlayerDto = z.infer<typeof UpdatePlayerDto>;
