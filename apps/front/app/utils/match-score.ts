import { isNonEmptyString } from "@sarpbc/utils";
import type { MatchResult, MatchStatus } from "~/types/matches";

export function getMatchParticipantScore(
  results: MatchResult[] | undefined,
  participantId: string | undefined,
): number | null {
  if (!results || !isNonEmptyString(participantId) || results.length === 0) {
    return null;
  }

  const result = results.find((entry) => entry.participant === participantId);

  return result?.score ?? null;
}

export function shouldShowMatchScores(status: MatchStatus): boolean {
  return status === "live" || status === "finished";
}

export function displayMatchScore(score: number | null, status: MatchStatus): string | null {
  if (!shouldShowMatchScores(status)) {
    return null;
  }

  if (score === null) {
    return "–";
  }

  return String(score);
}
