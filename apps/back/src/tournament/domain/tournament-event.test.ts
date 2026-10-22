import { describe, expect, it } from "vitest";
import { compareStages, eventDisplayName } from "./tournament-event";

describe("eventDisplayName", () => {
  it("prefixes the league to a serie that does not name it", () => {
    expect(
      eventDisplayName({
        leagueName: "RLCS Major",
        serieName: "Paris 2026",
        stageName: "Playoffs",
      }),
    ).toBe("RLCS Major Paris 2026");
  });

  it("keeps a serie that already starts with the league name", () => {
    expect(
      eventDisplayName({
        leagueName: "RLCS",
        serieName: "rlcs 2026 Major Paris",
        stageName: "Swiss",
      }),
    ).toBe("rlcs 2026 Major Paris");
  });

  it("names a year-only serie after its league", () => {
    expect(
      eventDisplayName({
        leagueName: "RLCS World Championship",
        serieName: "2026",
        stageName: "Group A",
      }),
    ).toBe("RLCS World Championship 2026");
  });

  it("falls back to a distinctive stage, then the year, for a year-only serie without league", () => {
    expect(eventDisplayName({ leagueName: null, serieName: "2026", stageName: "Winter Cup" })).toBe(
      "Winter Cup",
    );
    expect(eventDisplayName({ leagueName: null, serieName: "2026", stageName: "Playoffs" })).toBe(
      "2026",
    );
  });

  it("names a serie-less stage after its league and stage", () => {
    expect(
      eventDisplayName({ leagueName: "Gamers8", serieName: "  ", stageName: "Main Event" }),
    ).toBe("Gamers8 Main Event");
    expect(eventDisplayName({ leagueName: null, serieName: null, stageName: " Cup " })).toBe("Cup");
    expect(eventDisplayName({ leagueName: "League", serieName: null, stageName: "" })).toBe(
      "League",
    );
  });
});

describe("compareStages", () => {
  const stage = (name: string, beginAt: string | null) => ({
    name,
    beginAt: beginAt ? new Date(beginAt) : null,
  });

  it("orders newest day first, then name within a day", () => {
    const stages = [
      stage("Swiss", "2026-05-01T10:00:00Z"),
      stage("Group B", "2026-05-10T09:00:00Z"),
      stage("Group A", "2026-05-10T15:00:00Z"),
      stage("Undated", null),
    ];
    expect([...stages].sort(compareStages).map((s) => s.name)).toEqual([
      "Group A",
      "Group B",
      "Swiss",
      "Undated",
    ]);
  });
});
