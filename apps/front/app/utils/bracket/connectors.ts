import type { TournamentDetailMatch } from "@sarpbc/types";
import { getMatchWinnerParticipantId } from "./graph";
import type {
  BracketConnector,
  BracketLayoutMatch,
  BracketSectionLayout,
  BracketZone,
} from "./types";

export function buildConnectors(
  matches: TournamentDetailMatch[],
  matchIds: Set<string>,
): BracketConnector[] {
  const connectors: BracketConnector[] = [];

  for (const match of matches) {
    const links = (match.previousMatches ?? []).filter((link) => matchIds.has(link.previousMatch));

    links.forEach((link, index) => {
      connectors.push({
        fromMatchId: link.previousMatch,
        toMatchId: match.id,
        linkType: link.type,
        targetSlot: index === 0 ? "a" : "b",
      });
    });
  }

  return connectors;
}

export function toLayoutMatch(
  match: TournamentDetailMatch,
  column: number,
  row: number,
  zone?: BracketZone,
): BracketLayoutMatch {
  return {
    matchId: match.id,
    publicId: match.publicId,
    slug: match.slug,
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
  matches: TournamentDetailMatch[],
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
