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

const streamSchema = z.object({
  embed_url: z.string().default(""),
  language: z.string().default(""),
  main: z.boolean().default(false),
  official: z.boolean().default(false),
  raw_url: z.string().default(""),
});

export const matchSchema = z.object({
  begin_at: date,
  end_at: date,
  forfeit: z
    .boolean()
    .nullish()
    .transform((v) => v === true),
  id: z.number().int().positive(),
  name: text,
  number_of_games: z.number().int().nullish(),
  opponents: z
    .array(
      z.object({ opponent: z.object({ id: z.number().int().optional(), slug: text }).nullish() }),
    )
    .default([]),
  previous_matches: z
    .array(z.object({ match_id: z.number().int(), type: z.enum(["loser", "winner"]) }))
    .default([]),
  results: z.array(z.object({ score: z.number().int(), team_id: z.number().int() })).default([]),
  status: text,
  streams_list: z.array(streamSchema).default([]),
  tournament_id: z.number().int().positive(),
  winner_id: z.number().int().nullish(),
});

export type MatchStreamDto = z.infer<typeof streamSchema>;

export type MatchDto = z.infer<typeof matchSchema>;
