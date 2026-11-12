import { TEAM_ALIAS_NAME_MAX_LENGTH, TEAM_ALIAS_URL_MAX_LENGTH } from "@sarpbc/utils";
import { z } from "zod";

const day = z.iso.date("Use a real YYYY-MM-DD date");

export const TeamAliasDto = z.strictObject({
  name: z.string().trim().min(1).max(TEAM_ALIAS_NAME_MAX_LENGTH),
  from: day,
  to: day.nullable(),
  sourceUrl: z.string().trim().min(1).max(TEAM_ALIAS_URL_MAX_LENGTH),
  logoUrl: z.string().trim().max(TEAM_ALIAS_URL_MAX_LENGTH).nullable(),
  pandascoreId: z.int().positive().nullable(),
});
export type TeamAliasDto = z.infer<typeof TeamAliasDto>;
