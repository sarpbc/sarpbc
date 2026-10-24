import { describe, expect, it } from "vitest";
import { findManualCounterpart, type ManualCandidate } from "./manual-counterpart";

const stage = {
  name: "RLCS 2025 MENA Open Qualifier 4 Group B",
  leagueId: "league-rlcs",
  beginAt: new Date("2025-03-01T12:00Z"),
  endAt: null,
};

function candidate(overrides: Partial<ManualCandidate>): ManualCandidate {
  return {
    id: "manual-1",
    name: "RLCS MENA Open Qualifier 4 2025 – Group B",
    leagueId: null,
    beginAt: new Date("2025-03-01T00:00Z"),
    endAt: new Date("2025-03-02T00:00Z"),
    ...overrides,
  };
}

describe("findManualCounterpart", () => {
  it("matches the same words in any order with overlapping dates", () => {
    expect(findManualCounterpart(stage, [candidate({})])).toEqual({
      kind: "unique",
      id: "manual-1",
    });
  });

  it("rejects another region, another league or distant dates", () => {
    expect(
      findManualCounterpart(stage, [
        candidate({ id: "eu", name: "RLCS 2025 EU Open Qualifier 4 Group B" }),
        candidate({ id: "event", name: "RLCS 2025 MENA Open Qualifier 4" }),
        candidate({ id: "league", leagueId: "league-other" }),
        candidate({
          id: "late",
          beginAt: new Date("2025-03-10T00:00Z"),
          endAt: new Date("2025-03-11T00:00Z"),
        }),
        candidate({ id: "undated", beginAt: null }),
      ]),
    ).toEqual({ kind: "none" });
  });

  it("reports several matches as ambiguous", () => {
    expect(findManualCounterpart(stage, [candidate({}), candidate({ id: "manual-2" })])).toEqual({
      kind: "ambiguous",
      ids: ["manual-1", "manual-2"],
    });
  });
});
