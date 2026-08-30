import type { Match } from "~/types/matches";
import { getMatchWinnerParticipantId, resolvePreviousMatchId } from "./graph";
import type {
  BracketConnector,
  BracketLayoutMatch,
  BracketSectionLayout,
  BracketZone,
} from "./types";

export function buildConnectors(matches: Match[], matchIds: Set<string>): BracketConnector[] {
  const connectors: BracketConnector[] = [];

  for (const match of matches) {
    const links = (match.previousMatches ?? []).filter((link) =>
      matchIds.has(resolvePreviousMatchId(link.previousMatch)),
    );

    links.forEach((link, index) => {
      connectors.push({
        fromMatchId: resolvePreviousMatchId(link.previousMatch),
        toMatchId: match.id,
        linkType: link.type,
        targetSlot: index === 0 ? "a" : "b",
      });
    });
  }

  return connectors;
}

export function toLayoutMatch(
  match: Match,
  column: number,
  row: number,
  zone?: BracketZone,
): BracketLayoutMatch {
  return {
    matchId: match.id,
    column,
    row,
    zone,
    name: match.name,
    teamA: match.participants?.[0]?.team,
    teamB: match.participants?.[1]?.team,
    participantAId: match.participants?.[0]?.id,
    participantBId: match.participants?.[1]?.id,
    results: match.results,
    winnerParticipantId: getMatchWinnerParticipantId(match),
    beginAt: match.beginAt,
    endAt: match.endAt,
    status: match.status,
  };
}

export function finalizeSectionLayout(
  matches: Match[],
  layoutMatches: BracketLayoutMatch[],
  maxColumn: number,
): BracketSectionLayout {
  const matchIds = new Set(matches.map((match) => match.id));
  const maxRow = Math.max(...layoutMatches.map((match) => match.row), 0);

  return {
    matches: layoutMatches,
    connectors: buildConnectors(matches, matchIds),
    columnCount: maxColumn + 1,
    rowCount: maxRow + 2,
  };
}
