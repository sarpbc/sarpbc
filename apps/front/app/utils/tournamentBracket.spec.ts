import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import {
  buildBracketSectionLayout,
  buildDoubleEliminationCombinedLayout,
  buildEliminationTree,
  buildTournamentBracketView,
  classifyTournamentBracket,
  getMatchWinnerParticipantId,
  groupMatchesByRound,
  resolvePreviousMatchId,
  splitDoubleEliminationMatches,
} from "./tournamentBracket";

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    name: "Match",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    tournament: {} as Match["tournament"],
    ...overrides,
  };
}

function makeTournament(matches: Match[]): Tournament {
  return {
    id: "tournament-1",
    name: "Test Tournament",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    matches,
  };
}

function assertUniqueGridPositions(
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

describe("resolvePreviousMatchId", () => {
  it("returns string IDs unchanged", () => {
    expect(resolvePreviousMatchId("semi-a")).toBe("semi-a");
  });

  it("extracts id from populated previousMatch objects", () => {
    expect(resolvePreviousMatchId({ id: "semi-a" })).toBe("semi-a");
  });
});

describe("classifyTournamentBracket", () => {
  it("returns flat-stage for empty matches", () => {
    expect(classifyTournamentBracket(makeTournament([]))).toBe("flat-stage");
  });

  it("returns flat-stage for Swiss/group with no links", () => {
    const tournament = makeTournament([
      makeMatch({ id: "m1", beginAt: new Date("2026-01-02") }),
      makeMatch({ id: "m2", beginAt: new Date("2026-01-01") }),
    ]);

    expect(classifyTournamentBracket(tournament)).toBe("flat-stage");
  });

  it("returns bracket-missing-links when hasBracket is true but no link graph exists", () => {
    const tournament = makeTournament([makeMatch({ id: "m1" })]);
    tournament.hasBracket = true;

    expect(classifyTournamentBracket(tournament)).toBe("bracket-missing-links");
  });

  it("returns linked-single-elimination when winner links exist", () => {
    const tournament = makeTournament([
      makeMatch({
        id: "final",
        previousMatches: [{ match: "final", previousMatch: "semi", type: "winner" }],
      }),
    ]);

    expect(classifyTournamentBracket(tournament)).toBe("linked-single-elimination");
  });

  it("returns linked-double-elimination when loser links exist", () => {
    const tournament = makeTournament([
      makeMatch({
        id: "lower",
        previousMatches: [{ match: "lower", previousMatch: "upper", type: "loser" }],
      }),
    ]);

    expect(classifyTournamentBracket(tournament)).toBe("linked-double-elimination");
  });
});

describe("buildBracketSectionLayout", () => {
  it("places first-round matches on the left and the final on the right", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "semi-a" }),
      makeMatch({ id: "semi-b" }),
      makeMatch({
        id: "final",
        previousMatches: [
          { match: "final", previousMatch: "semi-a", type: "winner" },
          { match: "final", previousMatch: "semi-b", type: "winner" },
        ],
      }),
    ]);

    expect(layout).not.toBeNull();
    expect(layout?.columnCount).toBe(2);

    const semiA = layout?.matches.find((match) => match.matchId === "semi-a");
    const semiB = layout?.matches.find((match) => match.matchId === "semi-b");
    const final = layout?.matches.find((match) => match.matchId === "final");

    expect(semiA?.column).toBe(0);
    expect(semiB?.column).toBe(0);
    expect(final?.column).toBe(1);
    expect(layout?.connectors).toHaveLength(2);
  });

  it("centers a match between its feeder matches vertically", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "semi-a" }),
      makeMatch({ id: "semi-b" }),
      makeMatch({
        id: "final",
        previousMatches: [
          { match: "final", previousMatch: "semi-a", type: "winner" },
          { match: "final", previousMatch: "semi-b", type: "winner" },
        ],
      }),
    ]);

    const semiA = layout?.matches.find((match) => match.matchId === "semi-a");
    const semiB = layout?.matches.find((match) => match.matchId === "semi-b");
    const final = layout?.matches.find((match) => match.matchId === "final");

    expect(final?.row).toBe(((semiA?.row ?? 0) + (semiB?.row ?? 0)) / 2);
  });

  it("places matches in columns by beginAt day while respecting parent order", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "r1-a", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-b", beginAt: new Date("2026-01-01") }),
      makeMatch({
        id: "r2-a",
        beginAt: new Date("2026-01-02"),
        previousMatches: [
          { match: "r2-a", previousMatch: "r1-a", type: "winner" },
          { match: "r2-a", previousMatch: "r1-b", type: "winner" },
        ],
      }),
    ]);

    const r1a = layout?.matches.find((match) => match.matchId === "r1-a");
    const r2a = layout?.matches.find((match) => match.matchId === "r2-a");

    expect(r1a?.column).toBe(0);
    expect(r2a?.column).toBe(1);
  });

  it("separates same-depth matches played on different days into different columns", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "r1-a", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-b", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-c", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "r1-d", beginAt: new Date("2026-01-01") }),
      makeMatch({
        id: "r2-a",
        beginAt: new Date("2026-01-02"),
        previousMatches: [
          { match: "r2-a", previousMatch: "r1-a", type: "winner" },
          { match: "r2-a", previousMatch: "r1-b", type: "winner" },
        ],
      }),
      makeMatch({
        id: "r2-b",
        beginAt: new Date("2026-01-03"),
        previousMatches: [
          { match: "r2-b", previousMatch: "r1-c", type: "winner" },
          { match: "r2-b", previousMatch: "r1-d", type: "winner" },
        ],
      }),
    ]);

    const r2a = layout?.matches.find((match) => match.matchId === "r2-a");
    const r2b = layout?.matches.find((match) => match.matchId === "r2-b");

    expect(r2a?.column).toBe(1);
    expect(r2b?.column).toBe(2);
    expect(r2a?.column).not.toBe(r2b?.column);
  });

  it("keeps matches in the same column from overlapping when ideal rows collide", () => {
    const layout = buildBracketSectionLayout([
      makeMatch({ id: "r1-a" }),
      makeMatch({ id: "r1-b" }),
      makeMatch({ id: "r1-c" }),
      makeMatch({ id: "r1-d" }),
      makeMatch({
        id: "r2-a",
        previousMatches: [
          { match: "r2-a", previousMatch: "r1-a", type: "winner" },
          { match: "r2-a", previousMatch: "r1-b", type: "winner" },
        ],
      }),
      makeMatch({
        id: "r2-b",
        previousMatches: [
          { match: "r2-b", previousMatch: "r1-c", type: "winner" },
          { match: "r2-b", previousMatch: "r1-d", type: "winner" },
        ],
      }),
      makeMatch({
        id: "r2-c",
        previousMatches: [
          { match: "r2-c", previousMatch: "r1-a", type: "winner" },
          { match: "r2-c", previousMatch: "r1-c", type: "winner" },
        ],
      }),
    ]);

    const columnOneMatches = layout?.matches.filter((match) => match.column === 1) ?? [];
    const rows = columnOneMatches.map((match) => match.row);

    expect(columnOneMatches).toHaveLength(3);
    expect(new Set(rows).size).toBe(rows.length);
    expect(
      Math.min(...rows.map((row, index) => Math.abs(row - (rows[index + 1] ?? row + 2)))),
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("getMatchWinnerParticipantId", () => {
  it("uses explicit winner data when available", () => {
    const match = makeMatch({
      id: "m1",
      winner: { id: "p2" } as Match["winner"],
      participants: [
        { id: "p1" } as Match["participants"][0],
        { id: "p2" } as Match["participants"][1],
      ],
      results: [
        { participant: "p1", score: 1 },
        { participant: "p2", score: 3 },
      ],
    });

    expect(getMatchWinnerParticipantId(match)).toBe("p2");
  });

  it("falls back to scores when winner is missing", () => {
    const match = makeMatch({
      id: "m1",
      participants: [
        { id: "p1" } as Match["participants"][0],
        { id: "p2" } as Match["participants"][1],
      ],
      results: [
        { participant: "p1", score: 4 },
        { participant: "p2", score: 2 },
      ],
    });

    expect(getMatchWinnerParticipantId(match)).toBe("p1");
  });
});

describe("buildEliminationTree", () => {
  it("returns one final root for a simple single-elim bracket", () => {
    const matches = [
      makeMatch({ id: "semi-a" }),
      makeMatch({ id: "semi-b" }),
      makeMatch({
        id: "final",
        previousMatches: [
          { match: "final", previousMatch: "semi-a", type: "winner" },
          { match: "final", previousMatch: "semi-b", type: "winner" },
        ],
      }),
    ];

    const tree = buildEliminationTree(matches);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.matchId).toBe("final");
    expect(typeof tree[0]?.previousMatchA).toBe("object");
    expect(typeof tree[0]?.previousMatchB).toBe("object");
  });

  it("resolves populated previousMatch objects from the API", () => {
    const matches = [
      makeMatch({ id: "semi-a" }),
      makeMatch({ id: "semi-b" }),
      makeMatch({
        id: "final",
        previousMatches: [
          { match: "final", previousMatch: { id: "semi-a" }, type: "winner" },
          { match: "final", previousMatch: { id: "semi-b" }, type: "winner" },
        ],
      }),
    ];

    const tree = buildEliminationTree(matches);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.matchId).toBe("final");
    expect(tree[0]?.previousMatchA).toMatchObject({ matchId: "semi-a" });
    expect(tree[0]?.previousMatchB).toMatchObject({ matchId: "semi-b" });
  });
});

describe("splitDoubleEliminationMatches", () => {
  it("puts matches with loser feeds in the lower bracket", () => {
    const upperMatch = makeMatch({ id: "upper-final" });
    const lowerMatch = makeMatch({
      id: "lower-r1",
      previousMatches: [{ match: "lower-r1", previousMatch: "upper-final", type: "loser" }],
    });

    const { upper, lower } = splitDoubleEliminationMatches([upperMatch, lowerMatch]);

    expect(upper.map((match) => match.id)).toEqual(["upper-final"]);
    expect(lower.map((match) => match.id)).toEqual(["lower-r1"]);
  });

  it("propagates lower bracket to winner-fed descendants", () => {
    const upperSemi = makeMatch({ id: "upper-semi-a" });
    const lowerR1 = makeMatch({
      id: "lower-r1",
      beginAt: new Date("2026-01-02"),
      previousMatches: [{ match: "lower-r1", previousMatch: "upper-semi-a", type: "loser" }],
    });
    const lowerR2 = makeMatch({
      id: "lower-r2",
      beginAt: new Date("2026-01-03"),
      previousMatches: [{ match: "lower-r2", previousMatch: "lower-r1", type: "winner" }],
    });

    const { upper, lower } = splitDoubleEliminationMatches([upperSemi, lowerR1, lowerR2]);

    expect(upper.map((match) => match.id)).toEqual(["upper-semi-a"]);
    expect(lower.map((match) => match.id)).toEqual(["lower-r1", "lower-r2"]);
  });

  it("classifies mixed winner parents into the lower bracket", () => {
    const upperSemi = makeMatch({ id: "upper-semi-a" });
    const lowerR1 = makeMatch({
      id: "lower-r1",
      beginAt: new Date("2026-01-02"),
      previousMatches: [{ match: "lower-r1", previousMatch: "upper-semi-a", type: "loser" }],
    });
    const lowerR2 = makeMatch({
      id: "lower-r2",
      beginAt: new Date("2026-01-03"),
      previousMatches: [{ match: "lower-r2", previousMatch: "lower-r1", type: "winner" }],
    });
    const mixedMatch = makeMatch({
      id: "kc-vitality",
      name: "Karmine Corp vs Vitality",
      beginAt: new Date("2026-01-04"),
      previousMatches: [
        { match: "kc-vitality", previousMatch: "lower-r2", type: "winner" },
        { match: "kc-vitality", previousMatch: "upper-semi-a", type: "winner" },
      ],
    });

    const { upper, lower } = splitDoubleEliminationMatches([
      upperSemi,
      lowerR1,
      lowerR2,
      mixedMatch,
    ]);

    expect(upper.map((match) => match.id)).toEqual(["upper-semi-a"]);
    expect(lower.map((match) => match.id)).toEqual(["lower-r1", "lower-r2", "kc-vitality"]);
  });
});

describe("buildDoubleEliminationCombinedLayout", () => {
  function makeRlcsLikeDoubleElimMatches(): Match[] {
    const upperQf = ["uq1", "uq2", "uq3", "uq4"].map((id, index) =>
      makeMatch({ id, beginAt: new Date(`2026-01-0${index + 1}`) }),
    );
    const upperSf = ["us1", "us2"].map((id, index) =>
      makeMatch({
        id,
        beginAt: new Date(`2026-01-0${index + 5}`),
        previousMatches: [
          { match: id, previousMatch: upperQf[index * 2]!, type: "winner" },
          { match: id, previousMatch: upperQf[index * 2 + 1]!, type: "winner" },
        ],
      }),
    );
    const upperFinal = makeMatch({
      id: "uf",
      beginAt: new Date("2026-01-07"),
      previousMatches: [
        { match: "uf", previousMatch: "us1", type: "winner" },
        { match: "uf", previousMatch: "us2", type: "winner" },
      ],
    });

    const lowerR1 = ["lq1", "lq2"].map((id, index) =>
      makeMatch({
        id,
        beginAt: new Date(`2026-01-0${index + 5}`),
        previousMatches: [
          { match: id, previousMatch: upperQf[index * 2]!, type: "loser" },
          { match: id, previousMatch: upperQf[index * 2 + 1]!, type: "loser" },
        ],
      }),
    );
    const lowerR2 = makeMatch({
      id: "lr2",
      beginAt: new Date("2026-01-07"),
      previousMatches: [
        { match: "lr2", previousMatch: "lq1", type: "winner" },
        { match: "lr2", previousMatch: "lq2", type: "winner" },
      ],
    });
    const lowerQf = makeMatch({
      id: "lqf",
      beginAt: new Date("2026-01-08"),
      previousMatches: [
        { match: "lqf", previousMatch: "lr2", type: "winner" },
        { match: "lqf", previousMatch: "us1", type: "loser" },
      ],
    });
    const lowerSf = makeMatch({
      id: "lsf",
      beginAt: new Date("2026-01-09"),
      previousMatches: [
        { match: "lsf", previousMatch: "lqf", type: "winner" },
        { match: "lsf", previousMatch: "us2", type: "loser" },
      ],
    });
    const grandFinal = makeMatch({
      id: "gf",
      beginAt: new Date("2026-01-10"),
      previousMatches: [
        { match: "gf", previousMatch: "uf", type: "winner" },
        { match: "gf", previousMatch: "lsf", type: "winner" },
      ],
    });

    return [...upperQf, ...upperSf, upperFinal, ...lowerR1, lowerR2, lowerQf, lowerSf, grandFinal];
  }

  it("uses five columns for a full RLCS-like lower and finals progression", () => {
    const matches = makeRlcsLikeDoubleElimMatches();
    const { upper, lower } = splitDoubleEliminationMatches(matches);
    const upperIds = new Set(upper.map((match) => match.id));
    const layout = buildDoubleEliminationCombinedLayout(lower, upperIds);

    expect(layout).not.toBeNull();
    expect(layout?.columnCount).toBe(5);

    const byId = new Map(layout?.matches.map((match) => [match.matchId, match]));
    expect(byId.get("lq1")?.column).toBe(0);
    expect(byId.get("lq2")?.column).toBe(0);
    expect(byId.get("lr2")?.column).toBe(1);
    expect(byId.get("lqf")?.column).toBe(2);
    expect(byId.get("lsf")?.column).toBe(3);
    expect(byId.get("gf")?.column).toBe(4);
  });

  it("only keeps connectors between matches present in the combined grid", () => {
    const matches = makeRlcsLikeDoubleElimMatches();
    const { upper, lower } = splitDoubleEliminationMatches(matches);
    const upperIds = new Set(upper.map((match) => match.id));
    const layout = buildDoubleEliminationCombinedLayout(lower, upperIds);
    const layoutIds = new Set(layout?.matches.map((match) => match.matchId));

    for (const connector of layout?.connectors ?? []) {
      expect(layoutIds.has(connector.fromMatchId)).toBe(true);
      expect(layoutIds.has(connector.toMatchId)).toBe(true);
    }
  });

  it("places RLCS Major Paris playoffs lower matches on five columns", () => {
    const upperQf1 = makeMatch({
      id: "upper-qf-1",
      name: "Upper bracket quarterfinal 1: KC vs M8",
      beginAt: new Date("2026-05-23T12:02:58.000Z"),
    });
    const upperQf2 = makeMatch({
      id: "upper-qf-2",
      name: "Upper bracket quarterfinal 2: MCE vs SR",
      beginAt: new Date("2026-05-23T13:19:15.000Z"),
    });
    const lowerR1 = ["lr1-1", "lr1-2", "lr1-3", "lr1-4"].map((id, index) =>
      makeMatch({
        id,
        name: `Lower bracket round 1 match ${index + 1}`,
        beginAt: new Date(`2026-05-22T1${index}:00:00.000Z`),
      }),
    );
    const lowerR2 = ["lr2-1", "lr2-2"].map((id, index) =>
      makeMatch({
        id,
        name: `Lower bracket round 2 match ${index + 1}`,
        beginAt: new Date(`2026-05-23T1${index + 5}:00:00.000Z`),
        previousMatches: [
          {
            match: id,
            previousMatch: lowerR1[index * 2]!.id,
            type: "winner",
          },
          {
            match: id,
            previousMatch: lowerR1[index * 2 + 1]!.id,
            type: "winner",
          },
        ],
      }),
    );
    const lowerQf = ["lqf-1", "lqf-2"].map((id, index) =>
      makeMatch({
        id,
        name: `Lower bracket quarterfinal ${index + 1}`,
        beginAt: new Date(`2026-05-24T1${index + 2}:00:00.000Z`),
        previousMatches: [
          { match: id, previousMatch: index === 0 ? upperQf1.id : upperQf2.id, type: "loser" },
          { match: id, previousMatch: lowerR2[index]!.id, type: "winner" },
        ],
      }),
    );
    const semifinals = ["sf-1", "sf-2"].map((id, index) =>
      makeMatch({
        id,
        name: `Semifinal ${index + 1}`,
        beginAt: new Date(`2026-05-24T1${index + 4}:00:00.000Z`),
        previousMatches: [
          { match: id, previousMatch: index === 0 ? upperQf2.id : upperQf1.id, type: "winner" },
          { match: id, previousMatch: lowerQf[index]!.id, type: "winner" },
        ],
      }),
    );
    const grandFinal = makeMatch({
      id: "gf",
      name: "Grand final: TWIS vs KC",
      beginAt: new Date("2026-05-24T18:35:08.000Z"),
      previousMatches: [
        { match: "gf", previousMatch: semifinals[0]!.id, type: "winner" },
        { match: "gf", previousMatch: semifinals[1]!.id, type: "winner" },
      ],
    });

    const matches = [
      upperQf1,
      upperQf2,
      ...lowerR1,
      ...lowerR2,
      ...lowerQf,
      ...semifinals,
      grandFinal,
    ];
    const view = buildTournamentBracketView(makeTournament(matches));

    expect(view.upperLayout).toBeNull();
    expect(view.doubleEliminationLayout?.columnCount).toBe(5);
    expect(view.doubleEliminationLayout?.matches).toHaveLength(13);

    const byId = new Map(
      view.doubleEliminationLayout?.matches.map((match) => [match.matchId, match]),
    );
    expect(byId.get("lr1-1")?.column).toBe(0);
    expect(byId.get("lr2-1")?.column).toBe(1);
    expect(byId.get("lqf-1")?.column).toBe(2);
    expect(byId.get("sf-1")?.column).toBe(3);
    expect(byId.get("gf")?.column).toBe(4);
    expect(byId.get("upper-qf-1")?.column).toBe(2);
    expect(byId.get("upper-qf-2")?.column).toBe(2);
    expect(byId.get("upper-qf-1")!.row).toBeLessThan(byId.get("lqf-1")!.row);
    expect(byId.get("upper-qf-2")!.row).toBeLessThan(byId.get("lqf-2")!.row);
    expect(view.lowerBracketFlatMatches).toHaveLength(0);
    assertUniqueGridPositions(view.doubleEliminationLayout?.matches ?? []);
  });

  it("avoids overlapping upper and lower matches when lower round 2 is absent", () => {
    const upperQf1 = makeMatch({
      id: "upper-qf-1",
      name: "Upper bracket quarterfinal 1: M8 vs VIT",
      beginAt: new Date("2026-04-25T17:50:22.000Z"),
    });
    const upperQf2 = makeMatch({
      id: "upper-qf-2",
      name: "Upper bracket quarterfinal 2: NOVO Esports vs NIP",
      beginAt: new Date("2026-04-25T16:52:14.000Z"),
    });
    const lowerR1 = ["lr1-1", "lr1-2"].map((id, index) =>
      makeMatch({
        id,
        name: `Lower bracket round 1 match ${index + 1}`,
        beginAt: new Date(`2026-04-25T15:${index}0:00.000Z`),
      }),
    );
    const lowerQf = ["lqf-1", "lqf-2"].map((id, index) =>
      makeMatch({
        id,
        name: `Lower bracket quarterfinal ${index + 1}`,
        beginAt: new Date(`2026-04-26T15:0${index}:00.000Z`),
        previousMatches: [
          { match: id, previousMatch: index === 0 ? upperQf1.id : upperQf2.id, type: "loser" },
          { match: id, previousMatch: lowerR1[index]!.id, type: "winner" },
        ],
      }),
    );
    const semifinals = ["sf-1", "sf-2"].map((id, index) =>
      makeMatch({
        id,
        name: `Semifinal ${index + 1}`,
        beginAt: new Date(`2026-04-26T1${index + 7}:00:00.000Z`),
        previousMatches: [
          { match: id, previousMatch: index === 0 ? upperQf2.id : upperQf1.id, type: "winner" },
          { match: id, previousMatch: lowerQf[index]!.id, type: "winner" },
        ],
      }),
    );
    const grandFinal = makeMatch({
      id: "gf",
      name: "Grand final: M8 vs VIT",
      beginAt: new Date("2026-04-26T19:47:38.000Z"),
      previousMatches: [
        { match: "gf", previousMatch: semifinals[0]!.id, type: "winner" },
        { match: "gf", previousMatch: semifinals[1]!.id, type: "winner" },
      ],
    });

    const view = buildTournamentBracketView(
      makeTournament([upperQf1, upperQf2, ...lowerR1, ...lowerQf, ...semifinals, grandFinal]),
    );

    expect(view.doubleEliminationLayout?.matches).toHaveLength(9);
    assertUniqueGridPositions(view.doubleEliminationLayout?.matches ?? []);

    const byId = new Map(
      view.doubleEliminationLayout?.matches.map((match) => [match.matchId, match]),
    );
    const upperQf1Layout = byId.get("upper-qf-1")!;
    const upperQf2Layout = byId.get("upper-qf-2")!;
    const lqf1Layout = byId.get("lqf-1")!;
    const lqf2Layout = byId.get("lqf-2")!;

    expect(upperQf1Layout.column).toBe(lqf1Layout.column);
    expect(upperQf2Layout.column).toBe(lqf2Layout.column);
    expect(upperQf1Layout.row).not.toBe(upperQf2Layout.row);
    expect(lqf1Layout.row).toBeGreaterThan(Math.max(upperQf1Layout.row, upperQf2Layout.row));
    expect(lqf2Layout.row).toBeGreaterThan(Math.max(upperQf1Layout.row, upperQf2Layout.row));
  });
});

describe("groupMatchesByRound", () => {
  it("groups matches by round name and sorts rounds by earliest beginAt", () => {
    const groups = groupMatchesByRound([
      makeMatch({ id: "f1", name: "Final", beginAt: new Date("2026-01-03") }),
      makeMatch({ id: "s1", name: "Semifinal", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "s2", name: "Semifinal", beginAt: new Date("2026-01-02") }),
    ]);

    expect(groups.map((group) => group.round)).toEqual(["Semifinal", "Final"]);
    expect(groups[0]?.matches.map((match) => match.id)).toEqual(["s1", "s2"]);
  });
});

describe("buildTournamentBracketView", () => {
  it("sorts flat-stage matches by beginAt", () => {
    const tournament = makeTournament([
      makeMatch({ id: "later", beginAt: new Date("2026-01-03") }),
      makeMatch({ id: "earlier", beginAt: new Date("2026-01-01") }),
    ]);

    const view = buildTournamentBracketView(tournament);

    expect(view.format).toBe("flat-stage");
    expect(view.flatMatches.map((match) => match.id)).toEqual(["earlier", "later"]);
  });

  it("returns grouped rounds for bracket tournaments without link data", () => {
    const tournament = makeTournament([
      makeMatch({ id: "s1", name: "Semifinal", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "f1", name: "Final", beginAt: new Date("2026-01-02") }),
    ]);
    tournament.hasBracket = true;

    const view = buildTournamentBracketView(tournament);

    expect(view.format).toBe("bracket-missing-links");
    expect(view.groupedMatches.map((group) => group.round)).toEqual(["Semifinal", "Final"]);
  });

  it("builds upper and lower bracket layouts for double elimination", () => {
    const tournament = makeTournament([
      makeMatch({ id: "upper-semi-a" }),
      makeMatch({ id: "upper-semi-b" }),
      makeMatch({
        id: "upper-final",
        previousMatches: [
          { match: "upper-final", previousMatch: "upper-semi-a", type: "winner" },
          { match: "upper-final", previousMatch: "upper-semi-b", type: "winner" },
        ],
      }),
      makeMatch({
        id: "lower-r1",
        previousMatches: [{ match: "lower-r1", previousMatch: "upper-semi-a", type: "loser" }],
      }),
      makeMatch({
        id: "lower-final",
        previousMatches: [
          { match: "lower-final", previousMatch: "lower-r1", type: "winner" },
          { match: "lower-final", previousMatch: "upper-final", type: "loser" },
        ],
      }),
    ]);

    const view = buildTournamentBracketView(tournament);

    expect(view.format).toBe("linked-double-elimination");
    expect(view.upperLayout).toBeNull();
    expect(view.doubleEliminationLayout).not.toBeNull();
    expect(
      view.doubleEliminationLayout?.matches.find((match) => match.matchId === "lower-final")
        ?.column,
    ).toBe(1);
    expect(view.doubleEliminationLayout?.connectors.length).toBeGreaterThanOrEqual(1);
    expect(view.lowerBracketFlatMatches).toHaveLength(0);
  });

  it("keeps mixed-parent lower matches out of upper layout", () => {
    const tournament = makeTournament([
      makeMatch({ id: "upper-semi-a", beginAt: new Date("2026-01-01") }),
      makeMatch({
        id: "lower-r1",
        beginAt: new Date("2026-01-02"),
        previousMatches: [{ match: "lower-r1", previousMatch: "upper-semi-a", type: "loser" }],
      }),
      makeMatch({
        id: "lower-r2",
        beginAt: new Date("2026-01-03"),
        previousMatches: [{ match: "lower-r2", previousMatch: "lower-r1", type: "winner" }],
      }),
      makeMatch({
        id: "kc-vitality",
        name: "Karmine Corp vs Vitality",
        beginAt: new Date("2026-01-04"),
        previousMatches: [
          { match: "kc-vitality", previousMatch: "lower-r2", type: "winner" },
          { match: "kc-vitality", previousMatch: "upper-semi-a", type: "winner" },
        ],
      }),
    ]);

    const view = buildTournamentBracketView(tournament);
    const combinedMatchIds =
      view.doubleEliminationLayout?.matches.map((match) => match.matchId) ?? [];

    expect(combinedMatchIds).toContain("kc-vitality");
    expect(combinedMatchIds).toContain("lower-r2");
  });

  it("keeps lower bracket progression out of upper layout", () => {
    const tournament = makeTournament([
      makeMatch({ id: "upper-r1-a", beginAt: new Date("2026-01-01") }),
      makeMatch({ id: "upper-r1-b", beginAt: new Date("2026-01-01") }),
      makeMatch({
        id: "upper-r2",
        beginAt: new Date("2026-01-02"),
        previousMatches: [
          { match: "upper-r2", previousMatch: "upper-r1-a", type: "winner" },
          { match: "upper-r2", previousMatch: "upper-r1-b", type: "winner" },
        ],
      }),
      makeMatch({
        id: "lower-r1",
        beginAt: new Date("2026-01-02"),
        previousMatches: [{ match: "lower-r1", previousMatch: "upper-r1-a", type: "loser" }],
      }),
      makeMatch({
        id: "lower-r2",
        beginAt: new Date("2026-01-03"),
        previousMatches: [{ match: "lower-r2", previousMatch: "lower-r1", type: "winner" }],
      }),
    ]);

    const view = buildTournamentBracketView(tournament);
    const combinedMatchIds =
      view.doubleEliminationLayout?.matches.map((match) => match.matchId) ?? [];

    expect(combinedMatchIds).toContain("lower-r2");
    expect(combinedMatchIds).toContain("lower-r1");
  });
});

describe("getMatchParticipantScore", () => {
  it("finds scores for string and object participant shapes", () => {
    const results = [
      { participant: "p1", score: 3 },
      { participant: { id: "p2" }, score: 1 },
    ];

    expect(getMatchParticipantScore(results, "p1")).toBe(3);
    expect(getMatchParticipantScore(results, "p2")).toBe(1);
    expect(getMatchParticipantScore(results, "missing")).toBeNull();
  });
});
