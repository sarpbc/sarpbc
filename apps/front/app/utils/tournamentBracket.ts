import type { Match } from "~/types/matches";
import type { BracketLink, DrawnBracketMatch, Tournament } from "~/types/tournament";

export type TournamentBracketFormat =
  | "flat-stage"
  | "linked-single-elimination"
  | "linked-double-elimination"
  | "bracket-missing-links";

export interface TournamentBracketRoundGroup {
  round: string;
  matches: Match[];
}

export interface TournamentBracketView {
  format: TournamentBracketFormat;
  eliminationTree: DrawnBracketMatch[];
  lowerEliminationTree: DrawnBracketMatch[];
  lowerBracketFlatMatches: Match[];
  flatMatches: Match[];
  groupedMatches: TournamentBracketRoundGroup[];
}

interface BracketTreeNode {
  matchId: string;
  teamA?: DrawnBracketMatch["teamA"];
  teamB?: DrawnBracketMatch["teamB"];
  participantAId?: string;
  participantBId?: string;
  results?: DrawnBracketMatch["results"];
  previousMatchA?: { id: string; type: "winner" };
  previousMatchB?: { id: string; type: "winner" };
}

export function resolvePreviousMatchId(previousMatch: BracketLink["previousMatch"]): string {
  return typeof previousMatch === "string" ? previousMatch : previousMatch.id;
}

function toDrawnBracketMatch(match: Match): DrawnBracketMatch {
  return {
    matchId: match.id,
    teamA: match.participants?.[0]?.team,
    teamB: match.participants?.[1]?.team,
    participantAId: match.participants?.[0]?.id,
    participantBId: match.participants?.[1]?.id,
    results: match.results,
  };
}

function toBracketTreeNode(match: Match): BracketTreeNode {
  const winnerLinks = (match.previousMatches ?? []).filter((link) => link.type === "winner");

  return {
    ...toDrawnBracketMatch(match),
    previousMatchA: winnerLinks[0]
      ? { id: resolvePreviousMatchId(winnerLinks[0].previousMatch), type: "winner" }
      : undefined,
    previousMatchB: winnerLinks[1]
      ? { id: resolvePreviousMatchId(winnerLinks[1].previousMatch), type: "winner" }
      : undefined,
  };
}

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

export function sortMatchesByBeginAt(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const dateA = a.beginAt ? new Date(a.beginAt).getTime() : 0;
    const dateB = b.beginAt ? new Date(b.beginAt).getTime() : 0;
    return dateA - dateB;
  });
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

/**
 * PandaScore double-elim MVP split: any match fed by a loser link is lower bracket.
 * Upper bracket keeps all other matches (including grand finals with winner-only links).
 */
export function splitDoubleEliminationMatches(matches: Match[]): {
  upper: Match[];
  lower: Match[];
} {
  const lowerIds = new Set<string>();

  for (const match of matches) {
    const hasLoserFeed = match.previousMatches?.some((link) => link.type === "loser");
    if (hasLoserFeed) {
      lowerIds.add(match.id);
    }
  }

  return {
    upper: matches.filter((match) => !lowerIds.has(match.id)),
    lower: sortMatchesByBeginAt(matches.filter((match) => lowerIds.has(match.id))),
  };
}

function collectTreeMatchIds(nodes: DrawnBracketMatch[]): Set<string> {
  const ids = new Set<string>();

  const walk = (node: DrawnBracketMatch): void => {
    ids.add(node.matchId);
    if (node.previousMatchA && typeof node.previousMatchA !== "string") {
      walk(node.previousMatchA);
    }
    if (node.previousMatchB && typeof node.previousMatchB !== "string") {
      walk(node.previousMatchB);
    }
  };

  for (const root of nodes) {
    walk(root);
  }

  return ids;
}

export function buildEliminationTree(matches: Match[]): DrawnBracketMatch[] {
  const matchesMap = new Map<string, BracketTreeNode>();

  for (const match of matches) {
    matchesMap.set(match.id, toBracketTreeNode(match));
  }

  const finals = [...matchesMap.values()].filter((match) => {
    for (const other of matchesMap.values()) {
      if (
        other.previousMatchA?.id === match.matchId ||
        other.previousMatchB?.id === match.matchId
      ) {
        return false;
      }
    }
    return true;
  });

  const drawnMatches: DrawnBracketMatch[] = [];
  const addedMatches = new Map<string, DrawnBracketMatch>();

  const processMatch = (match: BracketTreeNode): DrawnBracketMatch => {
    const cached = addedMatches.get(match.matchId);
    if (cached) {
      return cached;
    }

    const drawnMatch: DrawnBracketMatch = {
      matchId: match.matchId,
      teamA: match.teamA,
      teamB: match.teamB,
      participantAId: match.participantAId,
      participantBId: match.participantBId,
      results: match.results,
    };

    addedMatches.set(match.matchId, drawnMatch);

    if (match.previousMatchA) {
      const previousMatchA = matchesMap.get(match.previousMatchA.id);
      if (previousMatchA) {
        drawnMatch.previousMatchA = processMatch(previousMatchA);
      }
    }

    if (match.previousMatchB) {
      const previousMatchB = matchesMap.get(match.previousMatchB.id);
      if (previousMatchB) {
        drawnMatch.previousMatchB = processMatch(previousMatchB);
      }
    }

    drawnMatches.push(drawnMatch);
    return drawnMatch;
  };

  for (const finalMatch of finals) {
    processMatch(finalMatch);
  }

  const finalIds = new Set(finals.map((match) => match.matchId));
  return drawnMatches.filter((match) => finalIds.has(match.matchId));
}

function partitionOrphanMatches(matches: Match[], tree: DrawnBracketMatch[]): Match[] {
  const connectedIds = collectTreeMatchIds(tree);
  return sortMatchesByBeginAt(matches.filter((match) => !connectedIds.has(match.id)));
}

export function buildTournamentBracketView(tournament: Tournament): TournamentBracketView {
  const format = classifyTournamentBracket(tournament);
  const matches = tournament.matches ?? [];

  switch (format) {
    case "flat-stage":
      return {
        format,
        eliminationTree: [],
        lowerEliminationTree: [],
        lowerBracketFlatMatches: [],
        flatMatches: sortMatchesByBeginAt(matches),
        groupedMatches: [],
      };
    case "bracket-missing-links":
      return {
        format,
        eliminationTree: [],
        lowerEliminationTree: [],
        lowerBracketFlatMatches: [],
        flatMatches: [],
        groupedMatches: groupMatchesByRound(matches),
      };
    case "linked-single-elimination":
      return {
        format,
        eliminationTree: buildEliminationTree(matches),
        lowerEliminationTree: [],
        lowerBracketFlatMatches: [],
        flatMatches: [],
        groupedMatches: [],
      };
    case "linked-double-elimination": {
      const { upper, lower } = splitDoubleEliminationMatches(matches);
      const lowerEliminationTree = buildEliminationTree(lower);
      return {
        format,
        eliminationTree: buildEliminationTree(upper),
        lowerEliminationTree,
        lowerBracketFlatMatches: partitionOrphanMatches(lower, lowerEliminationTree),
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
