import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import type { TournamentBracketFormat, TournamentBracketRoundGroup } from "./types";
import { sortMatchesByBeginAt } from "./rows";

export function classifyTournamentBracket(tournament: Tournament): TournamentBracketFormat {
  const matches = tournament.matches ?? [];
  if (matches.length === 0) {
    return "flat-stage";
  }

  const hasLoserLinks = matches.some((match) =>
    match.previousMatches?.some((link) => link.type === "loser"),
  );
  if (hasLoserLinks) {
    return "linked-double-elimination";
  }

  const hasWinnerLinks = matches.some((match) =>
    match.previousMatches?.some((link) => link.type === "winner"),
  );
  if (hasWinnerLinks) {
    return "linked-single-elimination";
  }

  if (tournament.hasBracket) {
    return "bracket-missing-links";
  }

  return "flat-stage";
}

export function groupMatchesByRound(matches: Match[]): TournamentBracketRoundGroup[] {
  const groups = new Map<string, Match[]>();

  for (const match of matches) {
    const round = match.name?.trim() || "TBD";
    const roundMatches = groups.get(round) ?? [];
    roundMatches.push(match);
    groups.set(round, roundMatches);
  }

  return [...groups.entries()]
    .map(([round, roundMatches]) => ({
      round,
      matches: sortMatchesByBeginAt(roundMatches),
    }))
    .sort((a, b) => {
      const dateA = a.matches[0]?.beginAt ? new Date(a.matches[0].beginAt).getTime() : 0;
      const dateB = b.matches[0]?.beginAt ? new Date(b.matches[0].beginAt).getTime() : 0;
      return dateA - dateB;
    });
}
