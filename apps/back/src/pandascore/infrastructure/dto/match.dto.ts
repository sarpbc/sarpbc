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
export const streamSchema = z.object({
  main: z.boolean().default(false),
  language: z.string().default(""),
  embed_url: z.string().default(""),
  official: z.boolean().default(false),
  raw_url: z.string().default(""),
});
export const matchSchema = z.object({
  id: z.number().int().positive(),
  tournament_id: z.number().int().positive(),
  name: text,
  slug: text,
  status: text,
  begin_at: date,
  end_at: date,
  number_of_games: z.number().int().nullish(),
  opponents: z
    .array(
      z.object({ opponent: z.object({ id: z.number().int().optional(), slug: text }).nullish() }),
    )
    .default([]),
  results: z.array(z.object({ team_id: z.number().int(), score: z.number().int() })).default([]),
  previous_matches: z
    .array(z.object({ type: z.enum(["loser", "winner"]), match_id: z.number().int() }))
    .default([]),
  streams_list: z.array(streamSchema).default([]),
});
export type MatchStreamDto = z.infer<typeof streamSchema>;
export type MatchDto = z.infer<typeof matchSchema>;
