import { isNonEmptyString } from "@sarpbc/utils";
import type { TournamentDetailMatch } from "@sarpbc/types";
import { getMatchParticipantScore } from "~/utils/match-score";

export const getMatchWinnerParticipantId = (match: TournamentDetailMatch): string | null => {
  if (isNonEmptyString(match.winnerId)) {
    return match.winnerId;
  }

  const participantAId = match.participants?.[0]?.id;
  const participantBId = match.participants?.[1]?.id;
  const scoreA = getMatchParticipantScore(match.results, participantAId);
  const scoreB = getMatchParticipantScore(match.results, participantBId);

  if (scoreA === null || scoreB === null) {
    return null;
  }

  if (scoreA > scoreB) {
    return participantAId ?? null;
  }

  if (scoreB > scoreA) {
    return participantBId ?? null;
  }

  return null;
};

export const getParentIds = (match: TournamentDetailMatch, matchIds: Set<string>): string[] =>
  (match.previousMatches ?? []).map((link) => link.previousMatch).filter((id) => matchIds.has(id));

export const getWinnerParentIds = (match: TournamentDetailMatch, matchIds: Set<string>): string[] =>
  (match.previousMatches ?? [])
    .filter((link) => link.type === "winner")
    .map((link) => link.previousMatch)
    .filter((id) => matchIds.has(id));

export const getWinnerParentIdsFromLinks = (match: TournamentDetailMatch): string[] =>
  (match.previousMatches ?? [])
    .filter((link) => link.type === "winner")
    .map((link) => link.previousMatch);

export const hasUpperWinnerFeed = (match: TournamentDetailMatch, upperIds: Set<string>): boolean =>
  (match.previousMatches ?? []).some(
    (link) => link.type === "winner" && upperIds.has(link.previousMatch),
  );
