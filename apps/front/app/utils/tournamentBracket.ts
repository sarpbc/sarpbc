import type { Match } from "~/types/matches";
import type { DrawnBracketMatch, Tournament } from "~/types/tournament";

export type TournamentBracketFormat = "flat-stage" | "single-elimination" | "double-elimination";

interface BracketTreeNode extends DrawnBracketMatch {
  previousMatchA?: { id: string; type: "winner" };
  previousMatchB?: { id: string; type: "winner" };
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
      ? { id: winnerLinks[0].previousMatch, type: "winner" }
      : undefined,
    previousMatchB: winnerLinks[1]
      ? { id: winnerLinks[1].previousMatch, type: "winner" }
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
    return "double-elimination";
  }

  const hasWinnerLinks = matches.some((match) =>
    match.previousMatches?.some((link) => link.type === "winner"),
  );
  if (hasWinnerLinks) {
    return "single-elimination";
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

export function buildTournamentBracketView(tournament: Tournament): {
  format: TournamentBracketFormat;
  eliminationTree: DrawnBracketMatch[];
  flatMatches: Match[];
  lowerBracketMatches: Match[];
} {
  const format = classifyTournamentBracket(tournament);
  const matches = tournament.matches ?? [];

  switch (format) {
    case "flat-stage":
      return {
        format,
        eliminationTree: [],
        flatMatches: sortMatchesByBeginAt(matches),
        lowerBracketMatches: [],
      };
    case "single-elimination":
      return {
        format,
        eliminationTree: buildEliminationTree(matches),
        flatMatches: [],
        lowerBracketMatches: [],
      };
    case "double-elimination": {
      const { upper, lower } = splitDoubleEliminationMatches(matches);
      return {
        format,
        eliminationTree: buildEliminationTree(upper),
        flatMatches: [],
        lowerBracketMatches: lower,
      };
    }
    default: {
      const exhaustiveCheck: never = format;
      return exhaustiveCheck;
    }
  }
}
