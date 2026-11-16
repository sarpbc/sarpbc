import { z } from "zod";
import { matchSchema } from "./match.dto";
import {
  teamSchema,
  playerSchema,
  leagueSchema,
  serieSchema,
  tournamentSchema,
} from "./tournament.dto";

export const currentPlayerSchema = playerSchema.extend({ current_team: teamSchema.nullish() });

export type CurrentPlayerDto = z.infer<typeof currentPlayerSchema>;

const change = z.enum(["creation", "update"]);

const base = {
  id: z.number().int(),
  modified_at: z.string().refine((v) => Number.isFinite(Date.parse(v)), "Invalid provider date"),
};

const upsert = z.discriminatedUnion("type", [
  z.object({
    ...base,
    change_type: change,
    object: tournamentSchema,
    type: z.literal("tournament"),
  }),
  z.object({ ...base, change_type: change, object: matchSchema, type: z.literal("match") }),
  z.object({ ...base, change_type: change, object: teamSchema, type: z.literal("team") }),
  z.object({
    ...base,
    change_type: change,
    object: currentPlayerSchema,
    type: z.literal("player"),
  }),
  z.object({ ...base, change_type: change, object: leagueSchema, type: z.literal("league") }),
  z.object({ ...base, change_type: change, object: serieSchema, type: z.literal("serie") }),
]);

export const incidentSchema = z.union([
  upsert,
  z.object({
    ...base,
    change_type: z.literal("deletion"),
    object: z
      .object({ reason: z.string().nullish() })
      .nullish()
      .catch(null)
      .transform((deletion) => deletion?.reason ?? null),
    type: z.enum(["league", "match", "player", "serie", "team", "tournament"]),
  }),
]);
