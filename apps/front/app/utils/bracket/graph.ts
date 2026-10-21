import type { TournamentDetailMatch } from "@sarpbc/types";
import { getMatchParticipantScore } from "~/types/matches";

export function getMatchWinnerParticipantId(match: TournamentDetailMatch): string | null {
  if (match.winnerId) {
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
}

export function getParentIds(match: TournamentDetailMatch, matchIds: Set<string>): string[] {
  return (match.previousMatches ?? [])
    .map((link) => link.previousMatch)
    .filter((id) => matchIds.has(id));
}

export function getWinnerParentIds(match: TournamentDetailMatch, matchIds: Set<string>): string[] {
  return (match.previousMatches ?? [])
    .filter((link) => link.type === "winner")
    .map((link) => link.previousMatch)
    .filter((id) => matchIds.has(id));
}

export function getWinnerParentIdsFromLinks(match: TournamentDetailMatch): string[] {
  return (match.previousMatches ?? [])
    .filter((link) => link.type === "winner")
    .map((link) => link.previousMatch);
}

export function hasUpperWinnerFeed(match: TournamentDetailMatch, upperIds: Set<string>): boolean {
  return (match.previousMatches ?? []).some(
    (link) => link.type === "winner" && upperIds.has(link.previousMatch),
  );
}
