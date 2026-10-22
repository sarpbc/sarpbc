import { z } from "zod";
const text = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);
const date = z
  .string()
  .refine((v) => Number.isFinite(Date.parse(v)), "Invalid provider date")
  .nullish()
  .transform((v) => v ?? undefined);
export const teamSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  location: text,
  image_url: text,
  dark_mode_image_url: text,
});
export const playerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  first_name: text,
  last_name: text,
  birthday: date,
  nationality: text,
  image_url: text,
  role: z.string().nullable().optional(),
});
export const leagueSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  url: z.string().nullable().optional(),
  image_url: text,
  modified_at: date,
});
export const rosterSchema = z.object({
  team: teamSchema,
  players: z.array(playerSchema).default([]),
});
export const serieSchema = z.object({
  id: z.number().int().positive(),
  full_name: text,
  year: z.number().int().optional().catch(undefined),
});
export const tournamentSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  type: text,
  country: text,
  begin_at: date,
  end_at: date,
  winner_id: z.number().int().nullable().optional(),
  winner_type: text,
  prizepool: z.union([z.number(), z.string()]).nullish(),
  tier: text,
  league: leagueSchema.nullish(),
  serie: serieSchema.nullish(),
  has_bracket: z.boolean().optional(),
  expected_roster: z.array(rosterSchema).default([]),
});
export type TeamDto = z.infer<typeof teamSchema>;
export type PlayerDto = z.infer<typeof playerSchema>;
export type LeagueDto = z.infer<typeof leagueSchema>;
export type SerieDto = z.infer<typeof serieSchema>;
export type ExpectedRosterDto = z.infer<typeof rosterSchema>;
export type TournamentDto = z.infer<typeof tournamentSchema>;
