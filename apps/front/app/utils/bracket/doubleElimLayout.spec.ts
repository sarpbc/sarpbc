import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import {
  buildDoubleEliminationCombinedLayout,
  splitDoubleEliminationMatches,
} from "./doubleElimLayout";
import { assertUniqueGridPositions, makeMatch, makeTournament } from "./testHelpers";
import { buildTournamentBracketView } from "./buildView";

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
