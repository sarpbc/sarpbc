import { describe, expect, it } from "vitest";
import { buildTournamentBracketView } from "./buildView";
import { makeMatch, makeTournament } from "./testHelpers";

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

  it("builds a unified double-elimination grid", () => {
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
