import type { Match, MatchResult } from "~/types/matches";
import type { DrawnBracketMatch, Tournament } from "~/types/tournament";
import type { Team } from "~/types/team";

export type TournamentBracketFormat =
  | "flat-stage"
  | "single-elimination"
  | "double-elimination"
  | "fallback-list";

interface BracketMatchNode {
  matchId: string;
  teamA?: Team;
  teamB?: Team;
  participantAId?: string;
  participantBId?: string;
  results?: MatchResult[];
  previousMatchA?: { id: string; type: "winner" | "loser" };
  previousMatchB?: { id: string; type: "winner" | "loser" };
}

export function classifyTournamentBracket(tournament: Tournament): TournamentBracketFormat {
  const matches = tournament.matches ?? [];
  if (matches.length === 0) {
    return "fallback-list";
  }

  const hasLoserLinks = matches.some((match) =>
    match.previousMatches?.some((link) => link.type === "loser"),
  );
  if (hasLoserLinks) {
    return "double-elimination";
  }

  const hasBracketLinks = matches.some((match) => (match.previousMatches?.length ?? 0) > 0);
  if (hasBracketLinks || tournament.hasBracket) {
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

export function matchToDrawnBracketMatch(match: Match): DrawnBracketMatch {
  return {
    matchId: match.id,
    teamA: match.participants?.[0]?.team,
    teamB: match.participants?.[1]?.team,
    participantAId: match.participants?.[0]?.id,
    participantBId: match.participants?.[1]?.id,
    results: match.results,
  };
}

export function getTeamScore(
  results: MatchResult[] | undefined,
  participantId: string | undefined,
): number | null {
  if (!results || !participantId || results.length === 0) {
    return null;
  }

  const result = results.find((entry) => {
    const id = typeof entry.participant === "string" ? entry.participant : entry.participant.id;
    return id === participantId;
  });

  return result?.score ?? null;
}

export function buildEliminationTree(matches: Match[]): DrawnBracketMatch[] {
  const matchesMap = new Map<string, BracketMatchNode>();

  for (const match of matches) {
    const winnerLinks = (match.previousMatches ?? []).filter((link) => link.type === "winner");

    matchesMap.set(match.id, {
      matchId: match.id,
      teamA: match.participants?.[0]?.team,
      teamB: match.participants?.[1]?.team,
      participantAId: match.participants?.[0]?.id,
      participantBId: match.participants?.[1]?.id,
      results: match.results,
      previousMatchA: winnerLinks[0]
        ? { id: winnerLinks[0].previousMatch, type: winnerLinks[0].type }
        : undefined,
      previousMatchB: winnerLinks[1]
        ? { id: winnerLinks[1].previousMatch, type: winnerLinks[1].type }
        : undefined,
    });
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

  const processMatch = (match: BracketMatchNode): DrawnBracketMatch => {
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
    case "fallback-list":
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
