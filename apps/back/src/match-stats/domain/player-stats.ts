import type {
  PlayerStatCounts,
  StatsEra,
  StatsGrouping,
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
  lastPlayedAt: Date | null;
}

export interface PlayerStatsSummary {
  games: number;
  unlinkedAccounts: number;
  tallies: readonly PlayerTally[];
}

export interface StatsMinGames {
  count: number;
  /** Applies to each player over every team, or to each player and team pair. */
  per: StatsGrouping;
}

export type StatsScope =
  | { kind: "tournaments"; ids: string[] }
  | {
      kind: "redistributable";
      era: StatsEra | null;
      minGames: StatsMinGames;
    };

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

interface PlayerRow {
  player: PlayerTally["player"];
  teams: Map<string, Pick<PlayerTally, "team" | "lastPlayedAt">>;
  games: number;
  totals: PlayerStatCounts;
  teamGoals: number;
}

const playedTime = (date: Date | null) => date?.getTime() ?? Number.NEGATIVE_INFINITY;

const toStats = ({ player, teams, games, totals, teamGoals }: PlayerRow) => {
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
    teams: [...teams.values()]
      .toSorted((a, b) => playedTime(b.lastPlayedAt) - playedTime(a.lastPlayedAt))
      .map(({ team }) => team),
    totals,
  } satisfies TournamentPlayerStats;
};

const teamKey = (team: PlayerTally["team"]) => team.id ?? team.name;

const rowKey = (tally: PlayerTally, by: StatsGrouping) => {
  switch (by) {
    case "player": {
      return tally.player.id;
    }

    case "team": {
      return JSON.stringify([tally.player.id, teamKey(tally.team)]);
    }

    default: {
      const exhaustive: never = by;

      return exhaustive;
    }
  }
};

const add = (row: PlayerRow, tally: PlayerTally) => {
  row.games += tally.games;
  row.teamGoals += tally.teamGoals;

  for (const count of COUNTS) {
    row.totals[count] += tally.totals[count];
  }

  const key = teamKey(tally.team);
  const known = row.teams.get(key);

  if (!known || playedTime(tally.lastPlayedAt) > playedTime(known.lastPlayedAt)) {
    row.teams.set(key, { lastPlayedAt: tally.lastPlayedAt, team: tally.team });
  }
};

export const playerStatsResponse = (
  { games, unlinkedAccounts, tallies }: PlayerStatsSummary,
  by: StatsGrouping,
) => {
  const rows = new Map<string, PlayerRow>();

  for (const tally of tallies) {
    const key = rowKey(tally, by);
    let row = rows.get(key);

    if (!row) {
      row = {
        games: 0,
        player: tally.player,
        teamGoals: 0,
        teams: new Map(),
        totals: emptyCounts(),
      };
      rows.set(key, row);
    }

    add(row, tally);
  }

  return {
    games,
    players: [...rows.values()]
      .map(toStats)
      .toSorted(
        (a, b) =>
          a.player.name.localeCompare(b.player.name) ||
          (a.teams[0]?.name ?? "").localeCompare(b.teams[0]?.name ?? ""),
      ),
    unlinkedAccounts,
  } satisfies TournamentPlayerStatsResponse;
};
