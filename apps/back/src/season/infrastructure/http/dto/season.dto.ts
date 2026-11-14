import { z } from "zod";
import { SEASON_AWARD_TYPES } from "@sarpbc/types";
import {
  MAX_SEASON_FORMAT_PHASES,
  SEASON_AWARD_PRESENTER_MAX_LENGTH,
  SEASON_AWARD_REGION_MAX_LENGTH,
  SEASON_AWARD_SOURCE_URL_MAX_LENGTH,
  SEASON_FORMAT_PHASE_DESCRIPTION_MAX_LENGTH,
  SEASON_FORMAT_PHASE_NAME_MAX_LENGTH,
  SEASON_FORMAT_SUMMARY_MAX_LENGTH,
  SEASON_NAME_MAX_LENGTH,
  SEASON_PATH_LABEL_MAX_LENGTH,
  SEASON_PATH_NOTE_MAX_LENGTH,
  SEASON_PATH_RESULT_MAX_LENGTH,
} from "@sarpbc/utils";

const SLUG_MAX_LENGTH = 120;

export const SeasonDto = z.strictObject({
  format: z
    .strictObject({
      phases: z
        .array(
          z.strictObject({
            description: z.string().max(SEASON_FORMAT_PHASE_DESCRIPTION_MAX_LENGTH).nullable(),
            name: z.string().trim().min(1).max(SEASON_FORMAT_PHASE_NAME_MAX_LENGTH),
          }),
        )
        .max(MAX_SEASON_FORMAT_PHASES),
      summary: z.string().max(SEASON_FORMAT_SUMMARY_MAX_LENGTH).nullable(),
    })
    .optional(),
  name: z.string().trim().min(1).max(SEASON_NAME_MAX_LENGTH),
  slug: z.string().trim().max(SLUG_MAX_LENGTH).nullish(),
  winnerTeamId: z.uuid().nullish(),
});

export type SeasonInput = z.infer<typeof SeasonDto>;

export const CreateSeasonAwardDto = z.strictObject({
  awardType: z.enum(SEASON_AWARD_TYPES),
  playerId: z.uuid(),
  presentedBy: z.string().max(SEASON_AWARD_PRESENTER_MAX_LENGTH).nullish(),
  region: z.string().max(SEASON_AWARD_REGION_MAX_LENGTH).nullish(),
  sourceUrl: z
    .string()
    .trim()
    .max(SEASON_AWARD_SOURCE_URL_MAX_LENGTH)
    .pipe(z.url().regex(/^https?:\/\//u, "Use an http(s) URL")),
});

export type CreateSeasonAwardInput = z.infer<typeof CreateSeasonAwardDto>;

const PathNote = z.string().max(SEASON_PATH_NOTE_MAX_LENGTH).nullable();

export const CreateSeasonParticipantDto = z.strictObject({
  pathNote: PathNote.optional(),
  teamId: z.uuid(),
});

export type CreateSeasonParticipantInput = z.infer<typeof CreateSeasonParticipantDto>;

export const UpdateSeasonParticipantDto = z.strictObject({ pathNote: PathNote });

export type UpdateSeasonParticipantInput = z.infer<typeof UpdateSeasonParticipantDto>;

export const CreateSeasonPathEntryDto = z.strictObject({
  label: z.string().trim().min(1).max(SEASON_PATH_LABEL_MAX_LENGTH),
  result: z.string().trim().min(1).max(SEASON_PATH_RESULT_MAX_LENGTH),
  tournamentId: z.uuid().nullish(),
});

export type CreateSeasonPathEntryInput = z.infer<typeof CreateSeasonPathEntryDto>;
