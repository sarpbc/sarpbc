import { z } from "zod";
import { SEASON_AWARD_TYPES } from "@sarpbc/types";
import {
  SEASON_AWARD_PRESENTER_MAX_LENGTH,
  SEASON_AWARD_REGION_MAX_LENGTH,
  SEASON_NAME_MAX_LENGTH,
} from "@sarpbc/utils";

export const SeasonDto = z.strictObject({
  name: z.string().trim().min(1).max(SEASON_NAME_MAX_LENGTH),
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
    .url()
    .regex(/^https?:\/\//, "Use an http(s) URL"),
});
export type CreateSeasonAwardDto = z.infer<typeof CreateSeasonAwardDto>;
