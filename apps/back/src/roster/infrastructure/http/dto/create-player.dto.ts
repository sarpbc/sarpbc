import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
export const CreatePlayerDto = z.strictObject({
  name: z.string().min(1),
  teamId: z.uuid().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthday: isoDateSchema.optional(),
  nationality: z.string().optional(),
  imageUrl: z.string().optional(),
  slug: z.string().optional(),
});

export type CreatePlayerDto = z.infer<typeof CreatePlayerDto>;
