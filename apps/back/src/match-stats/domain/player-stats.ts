import type {
  PlayerStatCounts,
  StatsEra,
  TournamentPlayerStats,
  TournamentPlayerStatsResponse,
  TournamentPlayerStatsTeam,
} from "@sarpbc/types";

export interface PlayerTally {
  player: TournamentPlayerStats["player"];
  team: TournamentPlayerStatsTeam;
  games: number;
  totals: PlayerStatCounts;
  teamGoals: number;
}

export interface PlayerStatsSummary {
  games: number;
  unlinkedAccounts: number;
  tallies: readonly PlayerTally[];
}

export type StatsScope =
  | { kind: "tournaments"; ids: string[] }
  | { kind: "redistributable"; minGames: number; era: StatsEra | null };

const COUNTS = ["goals", "assists", "saves", "shots", "demolitions"] as const;

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
};

const percentage = (part: number, whole: number) =>
  whole === 0 ? null : round((part * 100) / whole, 1);

const emptyCounts = () =>
  ({
    assists: 0,
    demolitions: 0,
    goals: 0,
    saves: 0,
    shots: 0,
  }) satisfies PlayerStatCounts;

const toStats = ({ player, team, games, totals, teamGoals }: PlayerTally) => {
  const perGame = emptyCounts();

  for (const count of COUNTS) {
    perGame[count] = round(totals[count] / games, 2);
  }

  return {
    games,
    goalParticipation: percentage(totals.goals + totals.assists, teamGoals),
    perGame,
    player,
    shootingPercentage: percentage(totals.goals, totals.shots),
    team,
    totals,
  } satisfies TournamentPlayerStats;
};

const merge = (into: PlayerTally, tally: PlayerTally) => {
  into.games += tally.games;
  into.teamGoals += tally.teamGoals;

  for (const count of COUNTS) {
    into.totals[count] += tally.totals[count];
  }
};

export const playerStatsResponse = ({ games, unlinkedAccounts, tallies }: PlayerStatsSummary) => {
  const merged = new Map<string, PlayerTally>();

  for (const tally of tallies) {
    const key = JSON.stringify([tally.player.id, tally.team.id ?? tally.team.name]);
    const existing = merged.get(key);

    if (existing) {
      merge(existing, tally);
    } else {
      merged.set(key, { ...tally, totals: { ...tally.totals } });
    }
  }

  return {
    games,
    players: [...merged.values()]
      .map(toStats)
      .toSorted(
        (a, b) =>
          a.team.name.localeCompare(b.team.name) || a.player.name.localeCompare(b.player.name),
      ),
    unlinkedAccounts,
  } satisfies TournamentPlayerStatsResponse;
};
