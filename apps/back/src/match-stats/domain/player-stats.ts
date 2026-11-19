import type {
  PlayerStatCounts,
  TournamentPlayerStats,
  TournamentPlayerStatsResponse,
  TournamentPlayerStatsTeam,
} from "@sarpbc/types";

export interface PlayerGameLine extends PlayerStatCounts {
  gameId: string;
  account: string;
  player: TournamentPlayerStats["player"] | null;
  team: TournamentPlayerStatsTeam;
  teamGoals: number;
}

interface Tally {
  player: TournamentPlayerStats["player"];
  team: TournamentPlayerStatsTeam;
  games: Set<string>;
  totals: PlayerStatCounts;
  teamGoals: number;
}

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

const toStats = ({ player, team, games, totals, teamGoals }: Tally) => {
  const perGame = emptyCounts();

  for (const count of COUNTS) {
    perGame[count] = round(totals[count] / games.size, 2);
  }

  return {
    games: games.size,
    goalParticipation: percentage(totals.goals + totals.assists, teamGoals),
    perGame,
    player,
    shootingPercentage: percentage(totals.goals, totals.shots),
    team,
    totals,
  } satisfies TournamentPlayerStats;
};

export const aggregatePlayerStats = (lines: readonly PlayerGameLine[]) => {
  const games = new Set<string>();
  const unlinked = new Set<string>();
  const tallies = new Map<string, Tally>();

  for (const line of lines) {
    games.add(line.gameId);

    if (!line.player) {
      unlinked.add(line.account);
      continue;
    }

    const key = JSON.stringify([line.player.id, line.team.id ?? line.team.name]);

    const tally = tallies.get(key) ?? {
      games: new Set<string>(),
      player: line.player,
      team: line.team,
      teamGoals: 0,
      totals: emptyCounts(),
    };

    tallies.set(key, tally);

    if (!tally.games.has(line.gameId)) {
      tally.teamGoals += line.teamGoals;
    }

    tally.games.add(line.gameId);

    for (const count of COUNTS) {
      tally.totals[count] += line[count];
    }
  }

  return {
    games: games.size,
    players: [...tallies.values()]
      .map(toStats)
      .toSorted(
        (a, b) =>
          a.team.name.localeCompare(b.team.name) || a.player.name.localeCompare(b.player.name),
      ),
    unlinkedAccounts: unlinked.size,
  } satisfies TournamentPlayerStatsResponse;
};
