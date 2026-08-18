import { describe, expect, it } from "vitest";
import type { CareerPlacement, CareerSplitRecord } from "~/types/career";
import {
  CAREER_PLACEMENTS,
  MAX_EVENTS_BEFORE_SPLIT,
  MAX_STAT,
  REGIONALS_PER_SPLIT,
  SPLITS_PER_SEASON,
  USER_ROSTER_ID,
  WORLDS_QUALIFICATION_RANK,
  getPlayerAge,
  getSeasonsPastPeak,
} from "~/types/career";
import {
  MAJOR_POINTS,
  REGIONAL_POINTS,
  computeCircuitPoints,
  computeSeasonPoints,
  computeWorldRankings,
  circuitPointsForSplit,
  deriveTrophies,
  getEventsBeforeStage,
  getTransferBand,
  pickOffseasonOffers,
  pickStartingTeam,
  qualifiesForWorlds,
  regionalCircuitWeight,
  resolveOffseasonContracts,
  simulateSplit,
  simulateSplitField,
  simulateWorlds,
  simulateWorldsField,
  snapshotWorldRanking,
} from "~/utils/career/simulation";
import {
  createCareerWorld,
  getRosterMatchStrength,
  getRosterStrength,
  moveUserToTeam,
  tickNpcRatings,
} from "~/utils/career/roster";
import { WORLD_TEAMS, getWorldTeamById, getWorldTeamsByRegion } from "~/data/career/world";
import { getAgeDecline } from "~/utils/career/stats";

const strongStats = { rating: 95, form: 95, morale: 95 };
const weakStats = { rating: 30, form: 30, morale: 30 };

const strongSplits = [
  {
    split: 1,
    regionals: ["finalist", "finalist", "winner"] as const,
    major: "finalist" as const,
    points: 38,
  },
  {
    split: 2,
    regionals: ["finalist", "finalist", "finalist"] as const,
    major: "finalist" as const,
    points: 35,
  },
];

function rankingsWith(overrides: {
  teamId?: string;
  splits?: CareerSplitRecord[];
  worlds?: CareerPlacement | null;
  previousPoints?: number | null;
  season?: number;
  careerId?: string;
  rating?: number;
}) {
  const careerId = overrides.careerId ?? "career-1";
  const teamId = overrides.teamId ?? "phantom-drive";
  const rating = overrides.rating ?? 82;
  const world = moveUserToTeam(createCareerWorld(careerId), teamId, null, rating, 1);
  return computeWorldRankings(
    careerId,
    {
      name: "Tester",
      teamId,
      rating,
      region: "na",
      season: overrides.season ?? 1,
      splits: [...(overrides.splits ?? [])],
      worlds: overrides.worlds ?? null,
      previousPoints: overrides.previousPoints ?? null,
    },
    world,
  );
}

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

  it("lets form and morale change the same seed's result", () => {
    const seed = 42;
    const hot = simulateSplit({ rating: 72, form: 90, morale: 85 }, "offense", seed);
    const cold = simulateSplit({ rating: 72, form: 35, morale: 30 }, "offense", seed);
    expect(hot.points).toBeGreaterThan(cold.points);
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

  it("awards double circuit points for the same major finish", () => {
    for (const placement of CAREER_PLACEMENTS) {
      if (placement === "unavailable") continue;
      expect(MAJOR_POINTS[placement]).toBe(REGIONAL_POINTS[placement] * 2);
    }
  });

  it("weights regional circuit points EU > NA > SAM/MENA > the rest", () => {
    expect(regionalCircuitWeight("eu")).toBeGreaterThan(regionalCircuitWeight("na"));
    expect(regionalCircuitWeight("na")).toBeGreaterThan(regionalCircuitWeight("sam"));
    expect(regionalCircuitWeight("sam")).toBe(regionalCircuitWeight("mena"));
    expect(regionalCircuitWeight("sam")).toBeGreaterThan(regionalCircuitWeight("oce"));
    expect(regionalCircuitWeight("oce")).toBe(regionalCircuitWeight("apac"));
    expect(regionalCircuitWeight("oce")).toBeGreaterThan(regionalCircuitWeight("ssa"));
  });

  it("pays less for the same regional run in a thinner region, but the same for a major", () => {
    const regionals = ["winner", "finalist", "top4"] as const;
    const eu = circuitPointsForSplit({ regionals, major: null }, "eu");
    const ssa = circuitPointsForSplit({ regionals, major: null }, "ssa");
    expect(eu).toBeGreaterThan(ssa);
    const euMajor = circuitPointsForSplit({ regionals, major: "winner" }, "eu");
    const ssaMajor = circuitPointsForSplit({ regionals, major: "winner" }, "ssa");
    expect(euMajor - eu).toBe(ssaMajor - ssa);
    expect(euMajor - eu).toBe(MAJOR_POINTS.winner);
  });

  it("gives a unique winner per regional and at most one major winner", () => {
    const careerId = "career-bracket";
    const world = createCareerWorld(careerId);
    const field = simulateSplitField(careerId, 1, 1, world, { teamId: null, rating: 70 });
    const regions = [...new Set(WORLD_TEAMS.map((team) => team.region))];
    for (const region of regions) {
      const ids = getWorldTeamsByRegion(region).map((team) => team.id);
      for (let regional = 0; regional < REGIONALS_PER_SPLIT; regional++) {
        const winners = ids.filter((id) => field.get(id)?.regionals[regional] === "winner");
        expect(winners).toHaveLength(1);
      }
    }
    const majorWinners = [...field.values()].filter((sim) => sim.major === "winner");
    expect(majorWinners.length).toBeLessThanOrEqual(1);
  });

  it("sits a burned-out player for early regionals and the major", () => {
    const careerId = "career-burnout";
    const teamId = "warpfield";
    const world = moveUserToTeam(createCareerWorld(careerId), teamId, null, 82, 1);
    const field = simulateSplitField(careerId, 1, 1, world, {
      teamId,
      rating: 82,
      skipRegionals: 2,
      skipMajor: true,
    });
    const sim = field.get(teamId);
    expect(sim?.regionals[0]).toBe("unavailable");
    expect(sim?.regionals[1]).toBe("unavailable");
    expect(sim?.regionals[2]).not.toBe("unavailable");
    expect(sim?.major === "unavailable" || sim?.major === null).toBe(true);
    const regionIds = getWorldTeamsByRegion("eu").map((team) => team.id);
    for (let regional = 0; regional < 2; regional++) {
      const winners = regionIds.filter((id) => field.get(id)?.regionals[regional] === "winner");
      expect(winners).toHaveLength(1);
      expect(winners[0]).not.toBe(teamId);
    }
  });

  it("gives a unique Worlds champion among the qualified field", () => {
    const careerId = "career-worlds-bracket";
    const world = createCareerWorld(careerId);
    const qualified = WORLD_TEAMS.slice(0, WORLDS_QUALIFICATION_RANK).map((team) => team.id);
    const placements = simulateWorldsField(careerId, 1, world, qualified, {
      teamId: null,
      rating: 70,
    });
    const winners = [...placements.entries()].filter(([, placement]) => placement === "winner");
    expect(winners).toHaveLength(1);
    expect(placements.size).toBe(qualified.length);
  });

  it("ranks all teams and players including the user", () => {
    const rankings = rankingsWith({ previousPoints: 20 });
    expect(rankings.teams).toHaveLength(WORLD_TEAMS.length);
    expect(rankings.teams.map((entry) => entry.rank)).toEqual(
      Array.from({ length: WORLD_TEAMS.length }, (_, i) => i + 1),
    );
    expect(rankings.players.some((player) => player.isUser)).toBe(true);
    expect(rankings.players).toHaveLength(WORLD_TEAMS.length * 3);
    const userTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(userTeam?.roster).toHaveLength(3);
    expect(userTeam?.roster.filter((player) => player.isUser)).toHaveLength(1);
    const user = rankings.players.find((player) => player.isUser);
    expect(user?.teamId).toBe(userTeam?.team.id);
    expect(user?.teamName).toBe(userTeam?.team.name);
  });

  it("shows zero year points before the season starts", () => {
    const rankings = rankingsWith({ previousPoints: 20 });
    expect(rankings.teams.every((entry) => entry.points === 0)).toBe(true);
    const userTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(userTeam?.rank).toBeGreaterThan(1);
  });

  it("lets last-year form trail a huge recent split", () => {
    const careerId = "career-recency";
    const teamId = "phantom-drive";
    const world = moveUserToTeam(createCareerWorld(careerId), teamId, null, 82, 1);
    world.rankSnapshot = WORLD_TEAMS.map((team) => ({
      teamId: team.id,
      points: team.id === teamId ? 96 : 20,
    }));
    world.splitFields = [
      {
        season: 1,
        split: 1,
        points: Object.fromEntries(
          WORLD_TEAMS.map((team) => [
            team.id,
            team.id === "apex-velocity" ? 50 : team.id === teamId ? 3 : 10,
          ]),
        ),
      },
    ];
    const rankings = computeWorldRankings(
      careerId,
      {
        name: "Tester",
        teamId,
        rating: 82,
        region: "na",
        season: 1,
        splits: [
          {
            split: 1,
            regionals: ["group", "group", "group"],
            major: null,
            points: 3,
          },
        ],
        worlds: null,
        previousPoints: 96,
      },
      world,
    );
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    const hotTeam = rankings.teams.find((entry) => entry.team.id === "apex-velocity");
    expect(playerTeam?.points).toBe(3);
    expect(hotTeam?.points).toBe(50);
    expect(hotTeam?.rank).toBeLessThan(playerTeam?.rank ?? 99);
    expect(playerTeam?.rank).toBeGreaterThan(1);
  });

  it("awards year points once a split is complete", () => {
    const rankings = rankingsWith({ splits: [strongSplits[0]!] });
    expect(rankings.teams.some((entry) => entry.points > 0)).toBe(true);
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(playerTeam?.points).toBe(38);
  });

  it("starts rookies on the weakest team of their region", () => {
    const teamId = pickStartingTeam("eu");
    expect(getWorldTeamById(teamId)?.region).toBe("eu");
    expect(teamId).toBe("warpfield");
  });

  it("counts only split points toward the circuit, not Worlds", () => {
    expect(computeCircuitPoints([...strongSplits])).toBe(73);
  });

  it("qualifies Worlds by top-16 rank, not a 42-point cutoff", () => {
    const modestSplits = [
      {
        split: 1,
        regionals: ["top4", "top4", "top8"] as const,
        major: "top8" as const,
        points: 19,
      },
      {
        split: 2,
        regionals: ["top4", "top8", "top8"] as const,
        major: "group" as const,
        points: 14,
      },
    ];
    expect(computeSeasonPoints(modestSplits)).toBeLessThan(42);

    const careerId = "career-2split";
    const teamId = "phantom-drive";
    const world = moveUserToTeam(createCareerWorld(careerId), teamId, null, 82, 1);
    world.splitFields = [
      {
        season: 1,
        split: 1,
        points: Object.fromEntries(
          WORLD_TEAMS.map((team, index) => [
            team.id,
            team.id === teamId ? 19 : index < 12 ? 28 : 8,
          ]),
        ),
      },
      {
        season: 1,
        split: 2,
        points: Object.fromEntries(
          WORLD_TEAMS.map((team, index) => [
            team.id,
            team.id === teamId ? 14 : index < 12 ? 24 : 6,
          ]),
        ),
      },
    ];
    const rankings = computeWorldRankings(
      careerId,
      {
        name: "Tester",
        teamId,
        rating: 82,
        region: "na",
        season: 1,
        splits: modestSplits,
        worlds: null,
        previousPoints: null,
      },
      world,
    );
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(playerTeam).toBeDefined();
    expect(playerTeam!.rank).toBeLessThanOrEqual(WORLDS_QUALIFICATION_RANK);
    expect(qualifiesForWorlds(playerTeam!.rank, WORLD_TEAMS.length)).toBe(true);
  });

  it("qualifies a strong circuit finish for Worlds after both splits", () => {
    const rankings = rankingsWith({
      careerId: "career-2split",
      splits: strongSplits,
    });
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(playerTeam?.rank).toBeLessThanOrEqual(WORLDS_QUALIFICATION_RANK);
    expect(qualifiesForWorlds(playerTeam!.rank, WORLD_TEAMS.length)).toBe(true);
  });

  it("misses Worlds when the team finishes outside the top 16", () => {
    const weakSplits = [
      {
        split: 1,
        regionals: ["group", "group", "group"] as const,
        major: null,
        points: 3,
      },
      {
        split: 2,
        regionals: ["group", "group", "group"] as const,
        major: null,
        points: 3,
      },
    ];
    const rankings = rankingsWith({
      careerId: "career-2split",
      teamId: "lunar-apex",
      rating: 30,
      splits: weakSplits,
      previousPoints: 8,
    });
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(playerTeam?.rank).toBeGreaterThan(WORLDS_QUALIFICATION_RANK);
    expect(qualifiesForWorlds(playerTeam!.rank, WORLD_TEAMS.length)).toBe(false);
  });

  it("treats every circuit team as top 16 when 16 or fewer teams play", () => {
    expect(qualifiesForWorlds(16, 16)).toBe(true);
    expect(qualifiesForWorlds(10, 10)).toBe(true);
    expect(qualifiesForWorlds(16, WORLD_TEAMS.length)).toBe(true);
    expect(qualifiesForWorlds(17, WORLD_TEAMS.length)).toBe(false);
  });

  it("always plays two splits and 1–3 events before each", () => {
    expect(SPLITS_PER_SEASON).toBe(2);
    const counts = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const n = getEventsBeforeStage(`career-${i}`, 1, "split1");
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(MAX_EVENTS_BEFORE_SPLIT);
      counts.add(n);
    }
    expect(counts.has(1)).toBe(true);
    expect(counts.has(MAX_EVENTS_BEFORE_SPLIT)).toBe(true);
    expect(getEventsBeforeStage("career-fixed", 1, "worlds")).toBe(1);
    expect(getEventsBeforeStage("career-fixed", 4, "split1")).toBe(
      getEventsBeforeStage("career-fixed", 4, "split1"),
    );
  });

  it("lets a later split with more points climb the table", () => {
    const careerId = "career-recency-later";
    const teamId = "phantom-drive";
    const world = moveUserToTeam(createCareerWorld(careerId), teamId, null, 82, 1);
    world.splitFields = [
      {
        season: 1,
        split: 1,
        points: Object.fromEntries(WORLD_TEAMS.map((team) => [team.id, 10])),
      },
      {
        season: 1,
        split: 2,
        points: Object.fromEntries(
          WORLD_TEAMS.map((team) => [team.id, team.id === "apex-velocity" ? 40 : 10]),
        ),
      },
    ];
    const afterSplit1 = computeWorldRankings(
      careerId,
      {
        name: "Tester",
        teamId,
        rating: 82,
        region: "na",
        season: 1,
        splits: [{ split: 1, regionals: ["top8", "top8", "top8"], major: null, points: 10 }],
        worlds: null,
        previousPoints: null,
      },
      world,
    );
    const afterSplit2 = computeWorldRankings(
      careerId,
      {
        name: "Tester",
        teamId,
        rating: 82,
        region: "na",
        season: 1,
        splits: [
          { split: 1, regionals: ["top8", "top8", "top8"], major: null, points: 10 },
          { split: 2, regionals: ["top8", "top8", "top8"], major: null, points: 10 },
        ],
        worlds: null,
        previousPoints: null,
      },
      world,
    );
    const hotAfter1 = afterSplit1.teams.find((entry) => entry.team.id === "apex-velocity")?.rank;
    const hotAfter2 = afterSplit2.teams.find((entry) => entry.team.id === "apex-velocity")?.rank;
    expect(hotAfter2).toBeLessThan(hotAfter1 ?? 99);
  });

  it("ranks a finalist-heavy season around world 3–4 without Worlds points", () => {
    const careerId = "career-finalist";
    const teamId = "phantom-drive";
    const world = moveUserToTeam(createCareerWorld(careerId), teamId, null, 82, 1);
    world.splitFields = [
      {
        season: 1,
        split: 1,
        points: Object.fromEntries(
          WORLD_TEAMS.map((team) => [
            team.id,
            team.id === "crimson-orbit"
              ? 42
              : team.id === "apex-velocity"
                ? 40
                : team.id === teamId
                  ? 38
                  : 22,
          ]),
        ),
      },
      {
        season: 1,
        split: 2,
        points: Object.fromEntries(
          WORLD_TEAMS.map((team) => [
            team.id,
            team.id === "crimson-orbit"
              ? 42
              : team.id === "apex-velocity"
                ? 38
                : team.id === teamId
                  ? 35
                  : 20,
          ]),
        ),
      },
    ];
    const rankings = computeWorldRankings(
      careerId,
      {
        name: "Tester",
        teamId,
        rating: 82,
        region: "na",
        season: 1,
        splits: [...strongSplits],
        worlds: "top8",
        previousPoints: null,
      },
      world,
    );
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(playerTeam?.points).toBe(73);
    expect(playerTeam?.rank).toBeGreaterThanOrEqual(2);
    expect(playerTeam?.rank).toBeLessThanOrEqual(5);
  });

  it("keeps post-Worlds team order after a transfer into the next season intro", () => {
    const careerId = "career-rank-lock";
    const originId = "warpfield";
    const rating = 82;
    const world = moveUserToTeam(createCareerWorld(careerId), originId, null, rating, 1);
    const player = {
      name: "Tester" as const,
      teamId: originId,
      rating,
      region: "eu" as const,
      season: 1,
      splits: [...strongSplits],
      worlds: "top8" as const,
      previousPoints: null,
    };
    const finished = computeWorldRankings(careerId, player, world);
    const destinationId = finished.teams[0]!.team.id;
    expect(destinationId).not.toBe(originId);

    const snapped = {
      ...world,
      rankSnapshot: snapshotWorldRanking(finished),
    };
    const transferred = moveUserToTeam(snapped, destinationId, originId, rating, 99);
    const nextWorld = tickNpcRatings(transferred, careerId, 2, "season");
    const intro = computeWorldRankings(
      careerId,
      {
        ...player,
        teamId: destinationId,
        season: 2,
        splits: [],
        worlds: null,
        previousPoints: computeCircuitPoints([...strongSplits]),
      },
      nextWorld,
    );

    expect(intro.teams.map((entry) => entry.team.id)).toEqual(
      finished.teams.map((entry) => entry.team.id),
    );
    expect(intro.teams[0]?.team.id).toBe(destinationId);
    expect(intro.teams.find((entry) => entry.team.id === destinationId)?.rank).toBe(1);
    expect(intro.teams.every((entry) => entry.points === 0)).toBe(true);

    const afterSplit1 = computeWorldRankings(
      careerId,
      {
        ...player,
        teamId: destinationId,
        season: 2,
        splits: [{ split: 1, regionals: ["group", "group", "group"], major: null, points: 8 }],
        worlds: null,
        previousPoints: computeCircuitPoints([...strongSplits]),
      },
      {
        ...nextWorld,
        splitFields: [
          {
            season: 2,
            split: 1,
            points: Object.fromEntries(
              WORLD_TEAMS.map((team) => [
                team.id,
                team.id === "lunar-apex" ? 55 : team.id === destinationId ? 8 : 12,
              ]),
            ),
          },
        ],
      },
    );
    expect(afterSplit1.teams[0]?.team.id).toBe("lunar-apex");
    expect(
      afterSplit1.teams.find((entry) => entry.team.id === destinationId)?.rank,
    ).toBeGreaterThan(1);
    expect(afterSplit1.teams.some((entry) => entry.points > 0)).toBe(true);
  });

  it("never offers a top-4 team after a bad season as a mid-tier player", () => {
    const rankings = rankingsWith({ previousPoints: 12, teamId: "warpfield", rating: 70 });
    for (let seed = 1; seed <= 40; seed++) {
      const offers = pickOffseasonOffers("warpfield", 12, rankings, seed);
      expect(offers.length).toBeLessThanOrEqual(1);
      for (const teamId of offers) {
        const rank = rankings.teams.find((entry) => entry.team.id === teamId)?.rank ?? 0;
        expect(rank).toBeGreaterThan(4);
      }
    }
    expect(getTransferBand(12, 10, 40)).toBeNull();
  });

  it("draws better clubs when the player outrates most of the field", () => {
    const rankings = rankingsWith({
      teamId: "uplink-racing",
      previousPoints: 12,
      rating: 96,
    });
    const user = rankings.players.find((player) => player.isUser);
    expect(user?.rank).toBeLessThanOrEqual(12);

    const currentRank =
      rankings.teams.find((entry) => entry.team.id === "uplink-racing")?.rank ?? 99;
    const counts: number[] = [];
    let sawTopFour = false;
    for (let seed = 1; seed <= 40; seed++) {
      const offers = pickOffseasonOffers("uplink-racing", 12, rankings, seed);
      expect(offers.length).toBeGreaterThanOrEqual(1);
      expect(offers.length).toBeLessThanOrEqual(3);
      counts.push(offers.length);
      for (const teamId of offers) {
        expect(teamId).not.toBe("uplink-racing");
        const rank = rankings.teams.find((entry) => entry.team.id === teamId)?.rank ?? 99;
        expect(rank).toBeLessThan(currentRank);
        if (rank <= 4) sawTopFour = true;
      }
    }
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(2);
    expect(sawTopFour).toBe(true);
  });

  it("can offer multiple higher-ranked teams after a strong season", () => {
    const rankings = rankingsWith({
      teamId: "warpfield",
      splits: strongSplits,
      worlds: "top8",
    });
    const counts: number[] = [];
    let sawTopFour = false;
    for (let seed = 1; seed <= 40; seed++) {
      const offers = pickOffseasonOffers("warpfield", 73, rankings, seed);
      expect(offers.length).toBeGreaterThanOrEqual(1);
      expect(offers.length).toBeLessThanOrEqual(3);
      counts.push(offers.length);
      for (const teamId of offers) {
        expect(teamId).not.toBe("warpfield");
        const rank = rankings.teams.find((entry) => entry.team.id === teamId)?.rank ?? 99;
        if (rank <= 4) sawTopFour = true;
      }
    }
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(2);
    expect(sawTopFour).toBe(true);
  });

  it("always renews during peak seasons", () => {
    const rankings = rankingsWith({ previousPoints: 40, teamId: "warpfield" });
    const resolution = resolveOffseasonContracts(3, 40, "warpfield", rankings, 9);
    expect(resolution.renewalOffered).toBe(true);
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

describe("career age decline", () => {
  it("does not ask about retirement before age 22", () => {
    expect(getPlayerAge(7)).toBe(22);
    expect(getSeasonsPastPeak(7)).toBe(0);
    expect(getSeasonsPastPeak(8)).toBe(1);
  });

  it("does not drop stats through age 22", () => {
    expect(getAgeDecline(1)).toEqual({});
    expect(getAgeDecline(7)).toEqual({});
  });

  it("drops rating and form after age 22", () => {
    expect(getAgeDecline(8)).toEqual({ rating: -2, form: -1, morale: 0 });
    expect(getAgeDecline(9)).toEqual({ rating: -3, form: -2, morale: -1 });
  });
});

describe("career rosters", () => {
  it("puts the user on a 3-player starting roster", () => {
    const world = moveUserToTeam(createCareerWorld("c1"), "warpfield", null, 70, 1);
    const roster = world.rosters.warpfield;
    expect(roster).toHaveLength(3);
    expect(roster).toContain(USER_ROSTER_ID);
    expect(new Set(roster).size).toBe(3);
  });

  it("keeps destination at 3 including the user after a transfer", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const started = moveUserToTeam(createCareerWorld("c1"), "warpfield", null, 70, seed);
      const beforeDest = started.rosters["crimson-orbit"]!;
      const transferred = moveUserToTeam(started, "crimson-orbit", "warpfield", 88, seed + 50);
      const destination = transferred.rosters["crimson-orbit"];
      const origin = transferred.rosters.warpfield;
      expect(destination).toHaveLength(3);
      expect(destination).toContain(USER_ROSTER_ID);
      expect(destination!.filter((id) => beforeDest.includes(id))).toHaveLength(2);
      expect(origin).toHaveLength(3);
      expect(origin).not.toContain(USER_ROSTER_ID);
      expect(new Set(destination).size).toBe(3);
      expect(new Set(origin).size).toBe(3);
      const userTeams = Object.entries(transferred.rosters)
        .filter(([, roster]) => roster.includes(USER_ROSTER_ID))
        .map(([id]) => id);
      expect(userTeams).toEqual(["crimson-orbit"]);
    }
  });

  it("raises team strength when a high-rated user replaces a weak player", () => {
    const world = createCareerWorld("c1");
    const before = getRosterStrength(world.rosters.warpfield!, world, 95);
    const next = moveUserToTeam(world, "warpfield", null, 95, 1);
    const after = getRosterStrength(next.rosters.warpfield!, next, 95);
    expect(after).toBeGreaterThan(before);

    const rankingsBefore = computeWorldRankings(
      "c1",
      {
        name: "Tester",
        teamId: null,
        rating: 95,
        region: "eu",
        season: 1,
        splits: [],
        worlds: null,
        previousPoints: 0,
      },
      world,
    );
    const rankingsAfter = computeWorldRankings(
      "c1",
      {
        name: "Tester",
        teamId: "warpfield",
        rating: 95,
        region: "eu",
        season: 1,
        splits: [],
        worlds: null,
        previousPoints: 0,
      },
      next,
    );
    const strengthBefore = rankingsBefore.teams.find(
      (entry) => entry.team.id === "warpfield",
    )?.strength;
    const strengthAfter = rankingsAfter.teams.find(
      (entry) => entry.team.id === "warpfield",
    )?.strength;
    expect(strengthAfter).toBeGreaterThan(strengthBefore ?? 0);
  });
});

describe("npc rating drift", () => {
  function npcRatings(world: ReturnType<typeof createCareerWorld>): Record<string, number> {
    const ratings: Record<string, number> = {};
    for (const [id, player] of Object.entries(world.players)) {
      ratings[id] = player.rating;
    }
    return ratings;
  }

  function npcRankOrder(world: ReturnType<typeof createCareerWorld>): string[] {
    return computeWorldRankings(
      "c-drift",
      {
        name: "Tester",
        teamId: null,
        rating: 70,
        region: "eu",
        season: 1,
        splits: [],
        worlds: null,
        previousPoints: 0,
      },
      world,
    )
      .players.filter((player) => !player.isUser)
      .map((player) => `${player.name}:${player.teamId}`);
  }

  it("changes NPC ratings between seasons and is deterministic", () => {
    const world = createCareerWorld("c-drift");
    const before = npcRatings(world);
    const season2 = tickNpcRatings(world, "c-drift", 2, "season");
    const season2Again = tickNpcRatings(world, "c-drift", 2, "season");
    const season3 = tickNpcRatings(world, "c-drift", 3, "season");

    expect(npcRatings(season2)).not.toEqual(before);
    expect(npcRatings(season2)).toEqual(npcRatings(season2Again));
    expect(npcRatings(season3)).not.toEqual(npcRatings(season2));
    expect(npcRatings(world)).toEqual(before);
  });

  it("assigns form and morale to every NPC", () => {
    const world = createCareerWorld("c-form");
    for (const player of Object.values(world.players)) {
      expect(player.form).toBeGreaterThan(0);
      expect(player.morale).toBeGreaterThan(0);
    }
  });

  it("lets NPC form and morale change match strength", () => {
    const world = createCareerWorld("c-form");
    const roster = world.rosters.warpfield!;
    const user = { rating: 70 };
    const before = getRosterMatchStrength(roster, world, user);
    for (const id of roster) {
      const npc = world.players[id];
      if (!npc) continue;
      npc.form = 95;
      npc.morale = 95;
    }
    expect(getRosterMatchStrength(roster, world, user)).toBeGreaterThan(before);
  });

  it("reshuffles Best Players after season ticks", () => {
    const world = createCareerWorld("c-drift");
    const orderBefore = npcRankOrder(world);
    let next = world;
    for (let season = 2; season <= 5; season++) {
      next = tickNpcRatings(next, "c-drift", season, "season");
    }
    expect(npcRankOrder(next)).not.toEqual(orderBefore);
  });

  it("drifts ratings after a split tick so mid-season ranks can move", () => {
    const world = createCareerWorld("c-drift");
    const afterSplit = tickNpcRatings(world, "c-drift", 1, "split1");
    expect(npcRatings(afterSplit)).not.toEqual(npcRatings(world));
  });

  it("never lets NPC ratings reach 100", () => {
    let world = createCareerWorld("c-drift");
    for (const player of Object.values(world.players)) {
      expect(player.rating).toBeLessThanOrEqual(MAX_STAT);
    }
    for (let season = 1; season <= 12; season++) {
      world = tickNpcRatings(world, "c-drift", season, "split1");
      world = tickNpcRatings(world, "c-drift", season, "split2");
      world = tickNpcRatings(world, "c-drift", season, "worlds");
      world = tickNpcRatings(world, "c-drift", season, "season");
    }
    for (const player of Object.values(world.players)) {
      expect(player.rating).toBeGreaterThanOrEqual(0);
      expect(player.rating).toBeLessThanOrEqual(MAX_STAT);
      expect(player.rating).toBeLessThan(100);
    }
  });
});
