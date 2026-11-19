import type { TournamentDetailMatch } from "@sarpbc/types";
import { getMatchWinnerParticipantId } from "./graph";
import type { BracketConnector, BracketLayoutMatch, BracketZone } from "./types";

export const buildConnectors = (matches: TournamentDetailMatch[], matchIds: Set<string>) => {
  const connectors: BracketConnector[] = [];

  for (const match of matches) {
    const links = (match.previousMatches ?? []).filter((link) => matchIds.has(link.previousMatch));

    for (const [index, link] of links.entries()) {
      connectors.push({
        fromMatchId: link.previousMatch,
        linkType: link.type,
        targetSlot: index === 0 ? "a" : "b",
        toMatchId: match.id,
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
) => ({
  beginAt: match.beginAt,
  column,
  endAt: match.endAt,
  forfeitedBy: match.forfeitedBy,
  matchId: match.id,
  name: match.name,
  participantA: match.participants?.[0],
  participantAId: match.participants?.[0]?.id,
  participantB: match.participants?.[1],
  participantBId: match.participants?.[1]?.id,
  publicId: match.publicId,
  results: match.results,
  row,
  slug: match.slug,
  status: match.status,
  winnerParticipantId: getMatchWinnerParticipantId(match),
  zone,
});

export const finalizeSectionLayout = (
  matches: TournamentDetailMatch[],
  layoutMatches: BracketLayoutMatch[],
  maxColumn: number,
) => {
  const matchIds = new Set(matches.map((match) => match.id));
  const maxRow = Math.max(...layoutMatches.map((match) => match.row), 0);

  return {
    columnCount: maxColumn + 1,
    connectors: buildConnectors(matches, matchIds),
    matches: layoutMatches,
    rowCount: maxRow + 2,
  };
};
