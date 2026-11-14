import { isNonEmptyString } from "@sarpbc/utils";
import type { MatchResult, MatchStatus } from "~/types/matches";

export const getMatchParticipantScore = (
  results: MatchResult[] | undefined,
  participantId: string | undefined,
): number | null => {
  if (!results || !isNonEmptyString(participantId) || results.length === 0) {
    return null;
  }

  const result = results.find((entry) => entry.participant === participantId);

  return result?.score ?? null;
};

export const shouldShowMatchScores = (status: MatchStatus): boolean =>
  status === "live" || status === "finished";

export const displayMatchScore = (score: number | null, status: MatchStatus): string | null => {
  if (!shouldShowMatchScores(status)) {
    return null;
  }

  if (score === null) {
    return "–";
  }

  return String(score);
};
