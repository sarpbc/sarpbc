import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import type { BracketLink } from "~/types/tournament";

export function resolvePreviousMatchId(previousMatch: BracketLink["previousMatch"]): string {
  return previousMatch instanceof Object ? previousMatch.id : previousMatch;
}

export function getMatchWinnerParticipantId(match: Match): string | null {
  if (match.winner?.id) {
    return match.winner.id;
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

export function getParentIds(match: Match, matchIds: Set<string>): string[] {
  return (match.previousMatches ?? [])
    .map((link) => resolvePreviousMatchId(link.previousMatch))
    .filter((id) => matchIds.has(id));
}

export function getWinnerParentIds(match: Match, matchIds: Set<string>): string[] {
  return (match.previousMatches ?? [])
    .filter((link) => link.type === "winner")
    .map((link) => resolvePreviousMatchId(link.previousMatch))
    .filter((id) => matchIds.has(id));
}

export function getWinnerParentIdsFromLinks(match: Match): string[] {
  return (match.previousMatches ?? [])
    .filter((link) => link.type === "winner")
    .map((link) => resolvePreviousMatchId(link.previousMatch));
}

export function hasUpperWinnerFeed(match: Match, upperIds: Set<string>): boolean {
  return (match.previousMatches ?? []).some(
    (link) => link.type === "winner" && upperIds.has(resolvePreviousMatchId(link.previousMatch)),
  );
}
