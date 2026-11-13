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
  name: z.string().trim().min(1).max(SEASON_NAME_MAX_LENGTH),
  slug: z.string().trim().max(SLUG_MAX_LENGTH).nullish(),
  format: z
    .strictObject({
      summary: z.string().max(SEASON_FORMAT_SUMMARY_MAX_LENGTH).nullable(),
      phases: z
        .array(
          z.strictObject({
            name: z.string().trim().min(1).max(SEASON_FORMAT_PHASE_NAME_MAX_LENGTH),
            description: z.string().max(SEASON_FORMAT_PHASE_DESCRIPTION_MAX_LENGTH).nullable(),
          }),
        )
        .max(MAX_SEASON_FORMAT_PHASES),
    })
    .optional(),
  winnerTeamId: z.uuid().nullish(),
});
export type SeasonDto = z.infer<typeof SeasonDto>;

export const CreateSeasonAwardDto = z.strictObject({
  playerId: z.uuid(),
  awardType: z.enum(SEASON_AWARD_TYPES),
  region: z.string().max(SEASON_AWARD_REGION_MAX_LENGTH).nullish(),
  presentedBy: z.string().max(SEASON_AWARD_PRESENTER_MAX_LENGTH).nullish(),
  sourceUrl: z
    .string()
    .trim()
    .max(SEASON_AWARD_SOURCE_URL_MAX_LENGTH)
    .url()
    .regex(/^https?:\/\//, "Use an http(s) URL"),
});
export type CreateSeasonAwardDto = z.infer<typeof CreateSeasonAwardDto>;

const PathNote = z.string().max(SEASON_PATH_NOTE_MAX_LENGTH).nullable();

export const CreateSeasonParticipantDto = z.strictObject({
  teamId: z.uuid(),
  pathNote: PathNote.optional(),
});
export type CreateSeasonParticipantDto = z.infer<typeof CreateSeasonParticipantDto>;

export const UpdateSeasonParticipantDto = z.strictObject({ pathNote: PathNote });
export type UpdateSeasonParticipantDto = z.infer<typeof UpdateSeasonParticipantDto>;

export const CreateSeasonPathEntryDto = z.strictObject({
  label: z.string().trim().min(1).max(SEASON_PATH_LABEL_MAX_LENGTH),
  result: z.string().trim().min(1).max(SEASON_PATH_RESULT_MAX_LENGTH),
  tournamentId: z.uuid().nullish(),
});
export type CreateSeasonPathEntryDto = z.infer<typeof CreateSeasonPathEntryDto>;
