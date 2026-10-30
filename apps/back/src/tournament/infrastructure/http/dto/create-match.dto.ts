import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
export const CreateMatchDto = z.strictObject({
  name: z.string(),
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
export const MatchVodLinkDto = z.strictObject({
  url: z.string().min(1).max(2048),
  language: z.string().min(1).max(8),
  source: z.enum(["twitch", "youtube"]).optional(),
});
export const SetMatchVodsDto = z.strictObject({
  vods: z.array(MatchVodLinkDto.extend({ game: z.number().int().min(1) })).max(100),
});
export type SetMatchVodsDto = z.infer<typeof SetMatchVodsDto>;
