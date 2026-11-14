import { TEAM_ALIAS_NAME_MAX_LENGTH, TEAM_ALIAS_URL_MAX_LENGTH } from "@sarpbc/utils";
import { z } from "zod";

const day = z.iso.date("Use a real YYYY-MM-DD date");

export const TeamAliasDto = z.strictObject({
  from: day,
  logoUrl: z.string().trim().max(TEAM_ALIAS_URL_MAX_LENGTH).nullable(),
  name: z.string().trim().min(1).max(TEAM_ALIAS_NAME_MAX_LENGTH),
  pandascoreId: z.int().positive().nullable(),
  sourceUrl: z.string().trim().min(1).max(TEAM_ALIAS_URL_MAX_LENGTH),
  to: day.nullable(),
});

export type TeamAliasInput = z.infer<typeof TeamAliasDto>;
