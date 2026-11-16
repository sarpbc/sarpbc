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
  dark_mode_image_url: text,
  id: z.number().int().positive(),
  image_url: text,
  location: text,
  name: z.string(),
  slug: z.string(),
});

export const playerSchema = z.object({
  birthday: date,
  first_name: text,
  id: z.number().int().positive(),
  image_url: text,
  last_name: text,
  name: z.string(),
  nationality: text,
  role: z.string().nullable().optional(),
  slug: z.string(),
});

export const leagueSchema = z.object({
  id: z.number().int().positive(),
  image_url: text,
  modified_at: date,
  name: z.string(),
  slug: z.string(),
  url: z.string().nullable().optional(),
});

const rosterSchema = z.object({
  players: z.array(playerSchema).default([]),
  team: teamSchema,
});

export const serieSchema = z.object({
  full_name: text,
  id: z.number().int().positive(),
  year: z.number().int().optional().catch(undefined),
});

export const standingSchema = z.object({
  rank: z.number().int().positive(),
  team: z.object({ id: z.number().int().positive() }).nullish(),
});

export const tournamentSchema = z.object({
  begin_at: date,
  country: text,
  end_at: date,
  expected_roster: z.array(rosterSchema).default([]),
  has_bracket: z.boolean().optional(),
  id: z.number().int().positive(),
  league: leagueSchema.nullish(),
  name: z.string(),
  prizepool: z.union([z.number(), z.string()]).nullish(),
  serie: serieSchema.nullish(),
  tier: text,
  type: text,
  winner_id: z.number().int().nullable().optional(),
  winner_type: text,
});

export type TeamDto = z.infer<typeof teamSchema>;

export type PlayerDto = z.infer<typeof playerSchema>;

export type LeagueDto = z.infer<typeof leagueSchema>;

export type SerieDto = z.infer<typeof serieSchema>;

export type ExpectedRosterDto = z.infer<typeof rosterSchema>;

export type TournamentDto = z.infer<typeof tournamentSchema>;
