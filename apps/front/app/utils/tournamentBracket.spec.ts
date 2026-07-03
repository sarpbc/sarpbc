import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import type { Tournament } from "~/types/tournament";
import {
  buildEliminationTree,
  buildTournamentBracketView,
  classifyTournamentBracket,
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

  it("returns flat-stage when hasBracket is true but no link graph exists", () => {
    const tournament = makeTournament([makeMatch({ id: "m1" })]);
    tournament.hasBracket = true;

    expect(classifyTournamentBracket(tournament)).toBe("flat-stage");
  });

  it("returns single-elimination when winner links exist", () => {
    const tournament = makeTournament([
      makeMatch({
        id: "final",
        previousMatches: [{ match: "final", previousMatch: "semi", type: "winner" }],
      }),
    ]);

    expect(classifyTournamentBracket(tournament)).toBe("single-elimination");
  });

  it("returns double-elimination when loser links exist", () => {
    const tournament = makeTournament([
      makeMatch({
        id: "lower",
        previousMatches: [{ match: "lower", previousMatch: "upper", type: "loser" }],
      }),
    ]);

    expect(classifyTournamentBracket(tournament)).toBe("double-elimination");
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
