import { isNonEmptyDateInput } from "@sarpbc/utils";
import type { TournamentDetail, TournamentDetailMatch } from "@sarpbc/types";
import type { TournamentBracketFormat, TournamentBracketRoundGroup } from "./types";
import { TBD_LABEL } from "~/utils/tbdLabel";
import { sortMatchesByBeginAt } from "./rows";

export function classifyTournamentBracket(tournament: TournamentDetail): TournamentBracketFormat {
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

export function groupMatchesByRound(
  matches: TournamentDetailMatch[],
): TournamentBracketRoundGroup[] {
  const groups = new Map<string, TournamentDetailMatch[]>();

  for (const match of matches) {
    const round = match.name?.trim() || TBD_LABEL;
    const roundMatches = groups.get(round) ?? [];
    roundMatches.push(match);
    groups.set(round, roundMatches);
  }

  return [...groups.entries()]
    .map(([round, roundMatches]) => ({
      round,
      matches: sortMatchesByBeginAt(roundMatches),
    }))
    .toSorted((a, b) => {
      const dateA = isNonEmptyDateInput(a.matches[0]?.beginAt)
        ? new Date(a.matches[0].beginAt).getTime()
        : 0;

      const dateB = isNonEmptyDateInput(b.matches[0]?.beginAt)
        ? new Date(b.matches[0].beginAt).getTime()
        : 0;

      return dateA - dateB;
    });
}
