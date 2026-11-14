import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";

export const CreatePlayerDto = z.strictObject({
  birthday: isoDateSchema.optional(),
  firstName: z.string().optional(),
  imageUrl: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().min(1),
  nationality: z.string().optional(),
  slug: z.string().optional(),
  teamId: z.uuid().optional(),
});

export type CreatePlayerInput = z.infer<typeof CreatePlayerDto>;
