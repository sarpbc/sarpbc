import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import {
  buildBracketSectionLayout,
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
    expect(view.upperLayout).not.toBeNull();
    expect(view.lowerLayout).not.toBeNull();
    expect(view.upperLayout?.matches.find((match) => match.matchId === "upper-final")?.column).toBe(
      1,
    );
    expect(view.lowerLayout?.matches.find((match) => match.matchId === "lower-final")?.column).toBe(
      1,
    );
    expect(view.lowerLayout?.connectors).toHaveLength(1);
    expect(view.lowerBracketFlatMatches).toHaveLength(0);
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
    const upperMatchIds = view.upperLayout?.matches.map((match) => match.matchId) ?? [];
    const lowerMatchIds = view.lowerLayout?.matches.map((match) => match.matchId) ?? [];

    expect(upperMatchIds).not.toContain("lower-r2");
    expect(lowerMatchIds).toContain("lower-r2");
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
