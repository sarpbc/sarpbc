import { describe, expect, it } from "vitest";
import { classifyTournamentBracket, groupMatchesByRound } from "./classify";
import { makeMatch, makeTournament } from "./testHelpers";

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
