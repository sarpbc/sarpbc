import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";

export const UpdatePlayerDto = z.strictObject({
  birthday: isoDateSchema.optional(),
  firstName: z.string().optional(),
  imageUrl: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  nationality: z.string().optional(),
  slug: z.string().optional(),
  teamId: z.uuid().nullable().optional(),
});

export type UpdatePlayerInput = z.infer<typeof UpdatePlayerDto>;
