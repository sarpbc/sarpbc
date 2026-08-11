import { describe, expect, it } from "vitest";
import { resolveMatchRailTitleKind } from "./matchRailTitle";

describe("resolveMatchRailTitleKind", () => {
  const now = new Date("2026-08-11T15:00:00");

  it("returns today when there are live matches", () => {
    expect(resolveMatchRailTitleKind([{ beginAt: new Date("2026-08-12T18:00:00") }], [], now)).toBe(
      "today",
    );
  });

  it("returns today when the earliest upcoming match is today", () => {
    expect(
      resolveMatchRailTitleKind(
        [],
        [
          { beginAt: new Date("2026-08-11T20:00:00") },
          { beginAt: new Date("2026-08-12T18:00:00") },
        ],
        now,
      ),
    ).toBe("today");
  });

  it("returns tomorrow when the earliest upcoming match is tomorrow", () => {
    expect(
      resolveMatchRailTitleKind(
        [],
        [
          { beginAt: new Date("2026-08-12T18:00:00") },
          { beginAt: new Date("2026-08-13T18:00:00") },
        ],
        now,
      ),
    ).toBe("tomorrow");
  });

  it("returns upcoming when matches are further out", () => {
    expect(resolveMatchRailTitleKind([], [{ beginAt: new Date("2026-08-14T18:00:00") }], now)).toBe(
      "upcoming",
    );
  });

  it("returns upcoming when dates are unknown", () => {
    expect(resolveMatchRailTitleKind([], [{ beginAt: null }], now)).toBe("upcoming");
  });
});
