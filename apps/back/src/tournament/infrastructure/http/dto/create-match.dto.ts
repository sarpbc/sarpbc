import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
export const CreateMatchDto = z.strictObject({
  name: z.string(),
  slug: z.string().optional(),
  beginAt: isoDateSchema.optional(),
  endAt: isoDateSchema.optional(),
  status: z.string().optional(),
  numberOfGames: z.number().optional(),
  participantIds: z.array(z.string()).min(2),
  pandascoreId: z.number().optional(),
});
export type CreateMatchDto = z.infer<typeof CreateMatchDto>;
export const SetMatchWinnerDto = z.strictObject({ winnerId: z.string() });
export type SetMatchWinnerDto = z.infer<typeof SetMatchWinnerDto>;
