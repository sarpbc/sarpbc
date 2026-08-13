import { describe, expect, it } from "vitest";
import { CAREER_PLACEMENTS, MAX_STAT, REGIONALS_PER_SPLIT, USER_ROSTER_ID } from "~/types/career";
import {
  MAJOR_POINTS,
  REGIONAL_POINTS,
  WORLDS_POINTS,
  computeCircuitPoints,
  computeWorldRankings,
  deriveTrophies,
  getTransferBand,
  pickOffseasonOffers,
  pickStartingTeam,
  resolveOffseasonContracts,
  simulateSplit,
  simulateWorlds,
} from "~/utils/career/simulation";
import {
  createCareerWorld,
  getRosterStrength,
  moveUserToTeam,
  tickNpcRatings,
} from "~/utils/career/roster";
import { WORLD_TEAMS, getWorldTeamById } from "~/data/career/world";
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
  splits?: typeof strongSplits;
  worlds?: "top8" | "winner" | null;
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

  it("keeps last-year world rank while this season's points can trail", () => {
    const rankings = rankingsWith({
      previousPoints: 96,
      splits: [strongSplits[0]!],
    });
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(playerTeam?.points).toBe(38);
    expect(playerTeam?.rank).toBeLessThanOrEqual(3);
    const byRankIds = rankings.teams.map((entry) => entry.team.id);
    const byYearPointsIds = [...rankings.teams]
      .sort((a, b) => b.points - a.points || a.rank - b.rank)
      .map((entry) => entry.team.id);
    expect(byRankIds).not.toEqual(byYearPointsIds);
    expect(
      rankings.teams.some(
        (entry) =>
          playerTeam !== undefined &&
          entry.rank > playerTeam.rank &&
          entry.points > playerTeam.points,
      ),
    ).toBe(true);
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

  it("adds circuit points from regionals, majors and Worlds", () => {
    expect(computeCircuitPoints([...strongSplits], "top8")).toBe(38 + 35 + WORLDS_POINTS.top8);
  });

  it("ranks a finalist-heavy Worlds top-8 season around world 3–4", () => {
    const rankings = rankingsWith({
      splits: strongSplits,
      worlds: "top8",
    });
    const playerTeam = rankings.teams.find((entry) => entry.isPlayerTeam);
    expect(playerTeam?.points).toBe(83);
    expect(playerTeam?.rank).toBeGreaterThanOrEqual(2);
    expect(playerTeam?.rank).toBeLessThanOrEqual(5);
  });

  it("never offers a top-4 team after a bad season", () => {
    const rankings = rankingsWith({ previousPoints: 12, teamId: "warpfield" });
    for (let seed = 1; seed <= 40; seed++) {
      const offers = pickOffseasonOffers("warpfield", 12, rankings, seed);
      expect(offers.length).toBeLessThanOrEqual(1);
      for (const teamId of offers) {
        const rank = rankings.teams.find((entry) => entry.team.id === teamId)?.rank ?? 0;
        expect(rank).toBeGreaterThan(4);
      }
    }
    expect(getTransferBand(12, 10)).toBeNull();
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
      const offers = pickOffseasonOffers("warpfield", 83, rankings, seed);
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
  it("does not drop stats during the five peak seasons", () => {
    expect(getAgeDecline(1)).toEqual({});
    expect(getAgeDecline(5)).toEqual({});
  });

  it("drops rating and form after the fifth season", () => {
    expect(getAgeDecline(6)).toEqual({ rating: -2, form: -1, morale: 0 });
    expect(getAgeDecline(7)).toEqual({ rating: -3, form: -2, morale: -1 });
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
