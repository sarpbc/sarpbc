import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import { classifyTournamentBracket, groupMatchesByRound } from "./classify";
import {
  buildUnifiedDoubleEliminationLayout,
  splitDoubleEliminationMatches,
} from "./doubleElimLayout";
import { resolvePreviousMatchId } from "./graph";
import { sortMatchesByBeginAt } from "./rows";
import { buildBracketSectionLayout } from "./singleElimLayout";
import type { TournamentBracketView } from "./types";

/** Matches with no in-set feeder links (shown as flat fallback rows). */
function getOrphanMatches(matches: Match[]): Match[] {
  const ids = new Set(matches.map((match) => match.id));
  const connected = new Set<string>();

  for (const match of matches) {
    for (const link of match.previousMatches ?? []) {
      const parentId = resolvePreviousMatchId(link.previousMatch);
      if (ids.has(parentId)) {
        connected.add(match.id);
        connected.add(parentId);
      }
    }
  }

  return sortMatchesByBeginAt(matches.filter((match) => !connected.has(match.id)));
}

export function buildTournamentBracketView(tournament: Tournament): TournamentBracketView {
  const format = classifyTournamentBracket(tournament);
  const matches = tournament.matches ?? [];

  switch (format) {
    case "flat-stage":
      return {
        format,
        upperLayout: null,
        doubleEliminationLayout: null,
        lowerBracketFlatMatches: [],
        flatMatches: sortMatchesByBeginAt(matches),
        groupedMatches: [],
      };
    case "bracket-missing-links":
      return {
        format,
        upperLayout: null,
        doubleEliminationLayout: null,
        lowerBracketFlatMatches: [],
        flatMatches: [],
        groupedMatches: groupMatchesByRound(matches),
      };
    case "linked-single-elimination":
      return {
        format,
        upperLayout: buildBracketSectionLayout(matches),
        doubleEliminationLayout: null,
        lowerBracketFlatMatches: [],
        flatMatches: [],
        groupedMatches: [],
      };
    case "linked-double-elimination": {
      const { upper, lower } = splitDoubleEliminationMatches(matches);
      const doubleEliminationLayout = buildUnifiedDoubleEliminationLayout(upper, lower, matches);
      return {
        format,
        upperLayout: null,
        doubleEliminationLayout,
        lowerBracketFlatMatches: getOrphanMatches(lower),
        flatMatches: [],
        groupedMatches: [],
      };
    }
    default: {
      const exhaustiveCheck: never = format;
      return exhaustiveCheck;
    }
  }
}
