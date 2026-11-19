import { describe, expect, it } from "vitest";
import { playerStatsResponse } from "./player-stats";
import type { PlayerTally } from "./player-stats";

const vitality = { id: "team-vit", name: "Vitality", slug: "vitality" };
const solary = { id: "team-sly", name: "Solary", slug: "solary" };
const zen = { id: "zen", name: "zen", slug: "zen" };
const kaydop = { id: "kaydop", name: "Kaydop", slug: "kaydop" };

const tally = (
  player: PlayerTally["player"],
  team: PlayerTally["team"],
  games: number,
  teamGoals: number,
  [goals, assists, saves, shots, demolitions]: [number, number, number, number, number],
) => ({
  games,
  player,
  team,
  teamGoals,
  totals: { assists, demolitions, goals, saves, shots },
});

describe(playerStatsResponse, () => {
  it("derives averages and percentages from each player's totals", () => {
    const stats = playerStatsResponse({
      games: 3,
      tallies: [
        tally(zen, vitality, 3, 5, [2, 3, 5, 5, 4]),
        tally(kaydop, solary, 2, 5, [4, 1, 4, 7, 2]),
      ],
      unlinkedAccounts: 1,
    });

    expect(stats).toStrictEqual({
      games: 3,
      players: [
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
      ],
      unlinkedAccounts: 1,
    });
  });

  it("keeps a stand-in apart from their own team", () => {
    const stats = playerStatsResponse({
      games: 3,
      tallies: [
        tally(kaydop, solary, 2, 3, [1, 0, 1, 3, 0]),
        tally(kaydop, vitality, 1, 3, [2, 1, 0, 3, 0]),
      ],
      unlinkedAccounts: 0,
    });

    expect(
      stats.players.map(({ team, games, totals, goalParticipation }) => ({
        games,
        goalParticipation,
        goals: totals.goals,
        team: team.name,
      })),
    ).toStrictEqual([
      { games: 2, goalParticipation: 33.3, goals: 1, team: "Solary" },
      { games: 1, goalParticipation: 100, goals: 2, team: "Vitality" },
    ]);
  });

  it("merges teamless lineups of the same name across stages", () => {
    const duo = { id: null, name: "zen / Kaydop", slug: null };

    const stats = playerStatsResponse({
      games: 2,
      tallies: [
        tally(zen, duo, 1, 1, [1, 0, 0, 1, 0]),
        tally(zen, { ...duo }, 1, 2, [1, 1, 0, 2, 0]),
      ],
      unlinkedAccounts: 0,
    });

    expect(stats.players).toMatchObject([
      { games: 2, goalParticipation: 100, team: duo, totals: { goals: 2 } },
    ]);
  });

  it("returns null percentages without shots or team goals", () => {
    const [row] = playerStatsResponse({
      games: 1,
      tallies: [tally(zen, vitality, 1, 0, [0, 0, 2, 0, 0])],
      unlinkedAccounts: 0,
    }).players;

    expect(row).toMatchObject({ goalParticipation: null, shootingPercentage: null });
  });

  it("returns no rows and no games when nothing was imported", () => {
    expect(playerStatsResponse({ games: 0, tallies: [], unlinkedAccounts: 0 })).toStrictEqual({
      games: 0,
      players: [],
      unlinkedAccounts: 0,
    });
  });
});
