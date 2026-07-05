import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import {
  buildEliminationTree,
  buildTournamentBracketView,
  classifyTournamentBracket,
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

  it("builds upper and lower elimination trees for double elimination", () => {
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
    expect(view.eliminationTree).toHaveLength(1);
    expect(view.eliminationTree[0]?.matchId).toBe("upper-final");
    expect(view.lowerEliminationTree).toHaveLength(1);
    expect(view.lowerEliminationTree[0]?.matchId).toBe("lower-final");
    expect(view.lowerBracketFlatMatches).toHaveLength(0);
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
