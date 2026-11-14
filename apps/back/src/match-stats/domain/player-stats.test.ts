import { describe, expect, it } from "vitest";
import { aggregatePlayerStats } from "./player-stats";
import type { PlayerGameLine } from "./player-stats";

const vitality = { id: "team-vit", name: "Vitality", slug: "vitality" };
const solary = { id: "team-sly", name: "Solary", slug: "solary" };
const zen = { id: "zen", name: "zen", slug: "zen" };
const kaydop = { id: "kaydop", name: "Kaydop", slug: "kaydop" };

const line = (
  gameId: string,
  player: PlayerGameLine["player"],
  team: PlayerGameLine["team"],
  teamGoals: number,
  [goals, assists, saves, shots, demolitions]: [number, number, number, number, number],
): PlayerGameLine => ({
  account: JSON.stringify(["steam", player?.id ?? `unlinked-${team.name}`]),
  assists,
  demolitions,
  gameId,
  goals,
  player,
  saves,
  shots,
  team,
  teamGoals,
});

const games: PlayerGameLine[] = [
  line("g1", zen, vitality, 3, [2, 1, 1, 4, 0]),
  line("g1", kaydop, solary, 1, [1, 0, 3, 2, 2]),
  line("g1", null, solary, 1, [0, 1, 2, 3, 1]),
  line("g2", zen, vitality, 2, [0, 2, 0, 1, 1]),
  line("g2", kaydop, solary, 4, [3, 1, 1, 5, 0]),
  line("g3", zen, vitality, 0, [0, 0, 4, 0, 3]),
];

describe(aggregatePlayerStats, () => {
  it("sums every game of a player into totals and derives averages from them", () => {
    const stats = aggregatePlayerStats(games);

    expect(stats.games).toBe(3);
    expect(stats.players).toStrictEqual([
      {
        games: 2,
        goalParticipation: 100,
        perGame: { assists: 0.5, demolitions: 1, goals: 2, saves: 2, shots: 3.5 },
        player: kaydop,
        shootingPercentage: 57.1,
        team: solary,
        totals: { assists: 1, demolitions: 2, goals: 4, saves: 4, shots: 7 },
      },
      {
        games: 3,
        goalParticipation: 100,
        perGame: { assists: 1, demolitions: 1.33, goals: 0.67, saves: 1.67, shots: 1.67 },
        player: zen,
        shootingPercentage: 40,
        team: vitality,
        totals: { assists: 3, demolitions: 4, goals: 2, saves: 5, shots: 5 },
      },
    ]);

    for (const key of ["goals", "assists", "saves", "shots", "demolitions"] as const) {
      const linked = games.filter((row) => row.player);
      expect(stats.players.reduce((sum, row) => sum + row.totals[key], 0)).toBe(
        linked.reduce((sum, row) => sum + row[key], 0),
      );
    }
  });

  it("counts a stand-in for the side they played on, apart from their own team", () => {
    const stats = aggregatePlayerStats([
      line("g1", kaydop, solary, 2, [1, 0, 0, 2, 0]),
      line("g2", kaydop, vitality, 3, [2, 1, 0, 3, 0]),
      line("g3", kaydop, solary, 1, [0, 0, 1, 1, 0]),
    ]);

    expect(
      stats.players.map(({ team, games: count, totals, goalParticipation }) => ({
        games: count,
        goalParticipation,
        goals: totals.goals,
        team: team.name,
      })),
    ).toStrictEqual([
      { games: 2, goalParticipation: 33.3, goals: 1, team: "Solary" },
      { games: 1, goalParticipation: 100, goals: 2, team: "Vitality" },
    ]);
  });

  it("leaves unlinked accounts out of the rows and counts each account once", () => {
    const stats = aggregatePlayerStats([
      line("g1", null, solary, 1, [1, 0, 0, 1, 0]),
      line("g2", null, solary, 0, [0, 0, 0, 1, 0]),
      line("g2", null, vitality, 2, [2, 0, 0, 2, 0]),
    ]);

    expect(stats).toStrictEqual({ games: 2, players: [], unlinkedAccounts: 2 });
  });

  it("groups a player without a team by participant name across stages", () => {
    const duo = { id: null, name: "zen & Kaydop", slug: null };

    const stats = aggregatePlayerStats([
      line("g1", zen, duo, 1, [1, 0, 0, 1, 0]),
      line("g2", zen, { ...duo }, 2, [1, 1, 0, 2, 0]),
    ]);

    expect(stats.players).toMatchObject([{ games: 2, team: duo, totals: { goals: 2 } }]);
  });

  it("returns null percentages without shots or team goals", () => {
    const [row] = aggregatePlayerStats([line("g1", zen, vitality, 0, [0, 0, 2, 0, 0])]).players;

    expect(row).toMatchObject({ goalParticipation: null, shootingPercentage: null });
  });

  it("returns no rows and no games when nothing was imported", () => {
    expect(aggregatePlayerStats([])).toStrictEqual({ games: 0, players: [], unlinkedAccounts: 0 });
  });
});
