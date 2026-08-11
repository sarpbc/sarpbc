import { describe, expect, it } from "vitest";
import { getTournamentTabFromPath, getTournamentTabTransitionName } from "./tournamentTabRoute";

describe("getTournamentTabFromPath", () => {
  it("returns overview for tournament root paths", () => {
    expect(getTournamentTabFromPath("/tournaments/abc")).toBe("overview");
    expect(getTournamentTabFromPath("/fr/tournaments/abc")).toBe("overview");
  });

  it("returns matches for matches tab paths", () => {
    expect(getTournamentTabFromPath("/tournaments/abc/matches")).toBe("matches");
    expect(getTournamentTabFromPath("/fr/tournaments/abc/matches")).toBe("matches");
  });
});

describe("getTournamentTabTransitionName", () => {
  it("returns left when moving to matches", () => {
    expect(getTournamentTabTransitionName("/tournaments/abc", "/tournaments/abc/matches")).toBe(
      "tournament-tab-left",
    );
  });

  it("returns right when moving to overview", () => {
    expect(getTournamentTabTransitionName("/tournaments/abc/matches", "/tournaments/abc")).toBe(
      "tournament-tab-right",
    );
  });

  it("returns null when tab does not change", () => {
    expect(getTournamentTabTransitionName("/tournaments/abc", "/tournaments/abc")).toBeNull();
  });
});
