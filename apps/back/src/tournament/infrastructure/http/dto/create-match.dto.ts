import { z } from "zod";
import { isoDateSchema } from "../../../../common/infrastructure/http/dto/iso-date.schema";
import { EMPTY_BRACKET_SIZES } from "@sarpbc/types";
import { DATA_SOURCE_URL_MAX_LENGTH } from "@sarpbc/utils";
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
  beginAt: isoDateSchema.optional(),
  endAt: isoDateSchema.optional(),
  name: z.string(),
  numberOfGames: z.number().optional(),
  participantIds: z.array(z.string()).min(2),
  previousMatches: bracketLinksSchema.optional(),
  sourceUrl: z.string().max(DATA_SOURCE_URL_MAX_LENGTH).nullable().optional(),
  status: z.string().optional(),
});

export type CreateMatchInput = z.infer<typeof CreateMatchDto>;

export const SetMatchSourceDto = z.strictObject({
  sourceUrl: z.string().max(DATA_SOURCE_URL_MAX_LENGTH).nullable(),
});

export type SetMatchSourceInput = z.infer<typeof SetMatchSourceDto>;

export const SetMatchForfeitDto = z.strictObject({ participantId: z.string().min(1).nullable() });

export type SetMatchForfeitInput = z.infer<typeof SetMatchForfeitDto>;

export const SetMatchWinnerDto = z.strictObject({ winnerId: z.string() });

export type SetMatchWinnerInput = z.infer<typeof SetMatchWinnerDto>;

export const UpdateMatchResultDto = z
  .strictObject({
    results: z
      .array(z.strictObject({ participantId: z.string().min(1), score: z.number().int().min(0) }))
      .length(2)
      .refine(
        ([first, second]) => first?.participantId !== second?.participantId,
        "Each side needs its own participant",
      )
      .optional(),
    status: z.enum(["not_started", "running", "finished"]).optional(),
  })
  .refine(
    ({ results, status }) => results !== undefined || status !== undefined,
    "Give a status or the scores",
  )
  .refine(
    ({ results, status }) =>
      status !== "finished" || results === undefined || results[0]?.score !== results[1]?.score,
    "A finished match needs a winner",
  );

export type UpdateMatchResultInput = z.infer<typeof UpdateMatchResultDto>;

export const MatchVodLinkDto = z.strictObject({
  language: z.string().min(1).max(8),
  source: z.enum(["twitch", "youtube"]).optional(),
  url: z.string().min(1).max(2048),
});

export const SetMatchVodsDto = z.strictObject({
  vods: z.array(MatchVodLinkDto.extend({ game: z.number().int().min(1) })).max(100),
});

export type SetMatchVodsInput = z.infer<typeof SetMatchVodsDto>;

export const SetMatchBracketDto = z.strictObject({
  participantIds: z.array(z.string().min(1)).max(2),
  previousMatches: bracketLinksSchema,
});

export type SetMatchBracketInput = z.infer<typeof SetMatchBracketDto>;

export const emptyBracketTeamsSchema = z.literal(EMPTY_BRACKET_SIZES);

export const CreateEmptyBracketDto = z.strictObject({
  numberOfGames: z.number().int().min(1).max(9).optional(),
  teams: emptyBracketTeamsSchema,
});

export type CreateEmptyBracketInput = z.infer<typeof CreateEmptyBracketDto>;
