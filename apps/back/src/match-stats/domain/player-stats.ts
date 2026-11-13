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

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentage(part: number, whole: number): number | null {
  return whole === 0 ? null : round((part * 100) / whole, 1);
}

function emptyCounts(): PlayerStatCounts {
  return { goals: 0, assists: 0, saves: 0, shots: 0, demolitions: 0 };
}

function toStats({ player, team, games, totals, teamGoals }: Tally): TournamentPlayerStats {
  const perGame = emptyCounts();
  for (const count of COUNTS) perGame[count] = round(totals[count] / games.size, 2);
  return {
    player,
    team,
    games: games.size,
    totals,
    perGame,
    shootingPercentage: percentage(totals.goals, totals.shots),
    goalParticipation: percentage(totals.goals + totals.assists, teamGoals),
  };
}

export function aggregatePlayerStats(
  lines: readonly PlayerGameLine[],
): TournamentPlayerStatsResponse {
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
      player: line.player,
      team: line.team,
      games: new Set<string>(),
      totals: emptyCounts(),
      teamGoals: 0,
    };
    tallies.set(key, tally);
    if (!tally.games.has(line.gameId)) tally.teamGoals += line.teamGoals;
    tally.games.add(line.gameId);
    for (const count of COUNTS) tally.totals[count] += line[count];
  }
  return {
    games: games.size,
    players: [...tallies.values()]
      .map(toStats)
      .sort(
        (a, b) =>
          a.team.name.localeCompare(b.team.name) || a.player.name.localeCompare(b.player.name),
      ),
    unlinkedAccounts: unlinked.size,
  };
}
