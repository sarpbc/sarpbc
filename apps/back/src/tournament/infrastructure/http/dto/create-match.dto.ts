import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { EMPTY_BRACKET_SIZES } from "@sarpbc/types";
import { MAX_INCOMING_BRACKET_LINKS } from "../../../domain/bracket";
export const bracketLinksSchema = z
  .array(
    z.strictObject({
      previousMatchId: z.string().min(1),
      type: z.enum(["winner", "loser"]),
    }),
  )
  .max(MAX_INCOMING_BRACKET_LINKS);
export const CreateMatchDto = z.strictObject({
  name: z.string(),
  beginAt: isoDateSchema.optional(),
  endAt: isoDateSchema.optional(),
  status: z.string().optional(),
  numberOfGames: z.number().optional(),
  participantIds: z.array(z.string()).min(2),
  previousMatches: bracketLinksSchema.optional(),
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
export const SetMatchBracketDto = z.strictObject({
  participantIds: z.array(z.string().min(1)).max(2),
  previousMatches: bracketLinksSchema,
});
export type SetMatchBracketDto = z.infer<typeof SetMatchBracketDto>;
export const emptyBracketTeamsSchema = z.literal(EMPTY_BRACKET_SIZES);
export const CreateEmptyBracketDto = z.strictObject({
  teams: emptyBracketTeamsSchema,
  numberOfGames: z.number().int().min(1).max(9).optional(),
});
export type CreateEmptyBracketDto = z.infer<typeof CreateEmptyBracketDto>;
