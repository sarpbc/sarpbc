import * as z from "zod";
import type { MatchResult } from "~/types/matches";

const matchResultParticipantIdSchema = z.preprocess((value) => {
  if (value instanceof Object && value !== null && "id" in value) {
    return (value as { id: unknown }).id;
  }

  return value;
}, z.string());

export const matchResultSchema: z.ZodType<MatchResult> = z.object({
  participant: matchResultParticipantIdSchema,
  score: z.number(),
});

export const matchResultsSchema = z.array(matchResultSchema);

export function parseMatchResults(
  results: MatchResult[] | null | undefined,
): MatchResult[] | undefined {
  if (results === undefined || results === null) {
    return undefined;
  }

  return matchResultsSchema.parse(results);
}
