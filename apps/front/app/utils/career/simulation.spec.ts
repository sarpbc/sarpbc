import { describe, expect, it } from "vitest";
import { CAREER_PLACEMENTS, REGIONALS_PER_SPLIT } from "~/types/career";
import {
  MAJOR_POINTS,
  REGIONAL_POINTS,
  computeWorldRankings,
  deriveTrophies,
  pickOffseasonOffer,
  pickStartingTeam,
  simulateSplit,
  simulateWorlds,
} from "~/utils/career/simulation";
import { WORLD_TEAMS, getWorldTeamById } from "~/data/career/world";

const strongStats = { rating: 95, form: 95, morale: 95 };
const weakStats = { rating: 30, form: 30, morale: 30 };

describe("career simulation", () => {
  it("simulates a split with three regionals and consistent points", () => {
    const sim = simulateSplit(strongStats, "offense", 42);
    expect(sim.regionals).toHaveLength(REGIONALS_PER_SPLIT);
    const regionalPoints = sim.regionals.reduce(
      (sum, placement) => sum + REGIONAL_POINTS[placement],
      0,
    );
    const expected = regionalPoints + (sim.major ? MAJOR_POINTS[sim.major] : 0);
    expect(sim.points).toBe(expected);
  });

  it("does not qualify weak teams for the major", () => {
    const sim = simulateSplit(weakStats, "defense", 7);
    expect(sim.major).toBeNull();
  });

  it("is deterministic for a given seed", () => {
    expect(simulateSplit(strongStats, "technical", 99)).toEqual(
      simulateSplit(strongStats, "technical", 99),
    );
    expect(simulateWorlds(strongStats, "technical", 99)).toBe(
      simulateWorlds(strongStats, "technical", 99),
    );
  });

  it("returns a valid worlds placement", () => {
    const placement = simulateWorlds(strongStats, "offense", 3);
    expect(CAREER_PLACEMENTS).toContain(placement);
  });

  it("ranks all teams and players including the user", () => {
    const rankings = computeWorldRankings("career-1", 4, {
      name: "Tester",
      teamId: WORLD_TEAMS[0]!.id,
      rating: 90,
      region: "eu",
    });
    expect(rankings.teams).toHaveLength(WORLD_TEAMS.length);
    expect(rankings.teams.map((entry) => entry.rank)).toEqual(
      Array.from({ length: WORLD_TEAMS.length }, (_, i) => i + 1),
    );
    expect(rankings.players.some((player) => player.isUser)).toBe(true);
    expect(rankings.players).toHaveLength(WORLD_TEAMS.length * 3 + 1);
  });

  it("starts rookies on the weakest team of their region", () => {
    const teamId = pickStartingTeam("eu");
    expect(getWorldTeamById(teamId)?.region).toBe("eu");
    expect(teamId).toBe("warpfield");
  });

  it("offers a different team than the current one", () => {
    const rankings = computeWorldRankings("career-2", 0, {
      name: "Tester",
      teamId: "warpfield",
      rating: 70,
      region: "eu",
    });
    for (const points of [0, 20, 40, 60]) {
      const offer = pickOffseasonOffer("warpfield", points, rankings, 13);
      expect(offer).not.toBe("warpfield");
      expect(getWorldTeamById(offer)).toBeDefined();
    }
  });

  it("gives high-ranked offers after strong seasons", () => {
    const rankings = computeWorldRankings("career-3", 0, {
      name: "Tester",
      teamId: "warpfield",
      rating: 90,
      region: "eu",
    });
    const offer = pickOffseasonOffer("warpfield", 60, rankings, 5);
    const rank = rankings.teams.find((entry) => entry.team.id === offer)?.rank ?? 99;
    expect(rank).toBeLessThanOrEqual(4);
  });

  it("derives trophies from regional, major and worlds wins", () => {
    const trophies = deriveTrophies([
      {
        season: 1,
        teamId: "warpfield",
        teamName: "Warpfield",
        splits: [
          { split: 1, regionals: ["winner", "top4", "group"], major: "winner", points: 36 },
          { split: 2, regionals: ["top8", "top8", "top8"], major: null, points: 9 },
        ],
        worlds: "winner",
        points: 65,
        ratingEnd: 88,
      },
    ]);
    expect(trophies).toEqual([
      { type: "regional", season: 1 },
      { type: "major", season: 1 },
      { type: "worlds", season: 1 },
    ]);
  });
});
