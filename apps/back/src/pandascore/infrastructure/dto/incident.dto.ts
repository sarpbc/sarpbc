import { z } from "zod";
import { matchSchema } from "./match.dto";
import { teamSchema, playerSchema, leagueSchema, tournamentSchema } from "./tournament.dto";
export const currentPlayerSchema = playerSchema.extend({ current_team: teamSchema.nullish() });
const change = z.enum(["creation", "update"]);
const base = {
  id: z.number().int(),
  modified_at: z.string().refine((v) => Number.isFinite(Date.parse(v)), "Invalid provider date"),
};
const upsert = z.discriminatedUnion("type", [
  z.object({
    ...base,
    change_type: change,
    type: z.literal("tournament"),
    object: tournamentSchema,
  }),
  z.object({ ...base, change_type: change, type: z.literal("match"), object: matchSchema }),
  z.object({ ...base, change_type: change, type: z.literal("team"), object: teamSchema }),
  z.object({
    ...base,
    change_type: change,
    type: z.literal("player"),
    object: currentPlayerSchema,
  }),
  z.object({ ...base, change_type: change, type: z.literal("league"), object: leagueSchema }),
  z.object({ ...base, change_type: change, type: z.literal("serie"), object: z.unknown() }),
]);
export const incidentSchema = z.union([
  upsert,
  z.object({
    ...base,
    change_type: z.literal("deletion"),
    type: z.enum(["league", "match", "player", "serie", "team", "tournament"]),
    object: z.unknown(),
  }),
]);
export type PandascoreIncidentDto = z.infer<typeof incidentSchema>;
export type PandascoreIncidentType = PandascoreIncidentDto["type"];
