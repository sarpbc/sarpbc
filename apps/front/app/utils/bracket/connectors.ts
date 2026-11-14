import type { TournamentDetailMatch } from "@sarpbc/types";
import { getMatchWinnerParticipantId } from "./graph";
import type {
  BracketConnector,
  BracketLayoutMatch,
  BracketSectionLayout,
  BracketZone,
} from "./types";

export const buildConnectors = (
  matches: TournamentDetailMatch[],
  matchIds: Set<string>,
): BracketConnector[] => {
  const connectors: BracketConnector[] = [];

  for (const match of matches) {
    const links = (match.previousMatches ?? []).filter((link) => matchIds.has(link.previousMatch));

    for (const [index, link] of links.entries()) {
      connectors.push({
        fromMatchId: link.previousMatch,
        toMatchId: match.id,
        linkType: link.type,
        targetSlot: index === 0 ? "a" : "b",
      });
    }
  }

  return connectors;
};

export const toLayoutMatch = (
  match: TournamentDetailMatch,
  column: number,
  row: number,
  zone?: BracketZone,
): BracketLayoutMatch => ({
  matchId: match.id,
  publicId: match.publicId,
  slug: match.slug,
  column,
  row,
  zone,
  name: match.name,
  participantA: match.participants?.[0],
  participantB: match.participants?.[1],
  participantAId: match.participants?.[0]?.id,
  participantBId: match.participants?.[1]?.id,
  results: match.results,
  winnerParticipantId: getMatchWinnerParticipantId(match),
  beginAt: match.beginAt,
  endAt: match.endAt,
  status: match.status,
});

export const finalizeSectionLayout = (
  matches: TournamentDetailMatch[],
  layoutMatches: BracketLayoutMatch[],
  maxColumn: number,
): BracketSectionLayout => {
  const matchIds = new Set(matches.map((match) => match.id));
  const maxRow = Math.max(...layoutMatches.map((match) => match.row), 0);

  return {
    matches: layoutMatches,
    connectors: buildConnectors(matches, matchIds),
    columnCount: maxColumn + 1,
    rowCount: maxRow + 2,
  };
};
