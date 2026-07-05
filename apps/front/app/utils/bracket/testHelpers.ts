import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";

export function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    name: "Match",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    tournament: {} as Match["tournament"],
    ...overrides,
  };
}

export function makeTournament(matches: Match[]): Tournament {
  return {
    id: "tournament-1",
    name: "Test Tournament",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    matches,
  };
}

export function assertUniqueGridPositions(
  matches: { matchId: string; column: number; row: number }[],
): void {
  const seen = new Map<string, string>();

  for (const match of matches) {
    const key = `${match.column}:${match.row}`;
    const existing = seen.get(key);
    if (existing) {
      throw new Error(
        `Overlapping positions at column ${match.column} row ${match.row}: ${existing} and ${match.matchId}`,
      );
    }

    seen.set(key, match.matchId);
  }
}
