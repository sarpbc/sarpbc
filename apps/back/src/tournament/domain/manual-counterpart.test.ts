import { describe, expect, it } from "vitest";
import { findManualCounterpart } from "./manual-counterpart";
import type { ManualCandidate } from "./manual-counterpart";

const stage = {
  beginAt: new Date("2025-03-01T12:00Z"),
  endAt: null,
  eventName: "RLCS 2025 MENA",
  leagueId: "league-rlcs",
  stageName: "Open Qualifier 4 Group B",
};

const candidate = (overrides: Partial<ManualCandidate>) => ({
  beginAt: new Date("2025-03-01T00:00Z"),
  endAt: new Date("2025-03-02T00:00Z"),
  id: "manual-1",
  leagueId: null,
  name: "RLCS MENA Open Qualifier 4 2025 – Group B",
  ...overrides,
});

describe(findManualCounterpart, () => {
  it("matches the same words in any order with overlapping dates", () => {
    expect(findManualCounterpart(stage, [candidate({})])).toStrictEqual({
      id: "manual-1",
      kind: "unique",
    });
  });

  it("rejects another region, another league or distant dates", () => {
    expect(
      findManualCounterpart(stage, [
        candidate({ id: "eu", name: "RLCS 2025 EU Open Qualifier 4 Group B" }),
        candidate({ id: "event", name: "RLCS 2025 MENA Open Qualifier 4" }),
        candidate({ id: "league", leagueId: "league-other" }),
        candidate({
          beginAt: new Date("2025-03-10T00:00Z"),
          endAt: new Date("2025-03-11T00:00Z"),
          id: "late",
        }),
        candidate({ beginAt: null, id: "undated" }),
      ]),
    ).toStrictEqual({ kind: "none" });
  });

  it("reports several matches as ambiguous", () => {
    expect(
      findManualCounterpart(stage, [candidate({}), candidate({ id: "manual-2" })]),
    ).toStrictEqual({
      ids: ["manual-1", "manual-2"],
      kind: "ambiguous",
    });
  });
});
