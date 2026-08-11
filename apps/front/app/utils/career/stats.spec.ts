import { describe, expect, it } from "vitest";
import {
  applyStatDelta,
  clampStat,
  computeComposite,
  getStartingStats,
} from "~/utils/career/stats";

describe("career stats", () => {
  it("clamps values between 0 and 100", () => {
    expect(clampStat(-5)).toBe(0);
    expect(clampStat(150)).toBe(100);
    expect(clampStat(42.6)).toBe(43);
  });

  it("applies stat deltas", () => {
    const result = applyStatDelta({ rating: 50, form: 50, morale: 50 }, { rating: 10, form: -5 });
    expect(result).toEqual({ rating: 60, form: 45, morale: 50 });
  });

  it("combines background base stats with role modifiers", () => {
    expect(getStartingStats("prodigy", "offense")).toEqual({ rating: 75, form: 53, morale: 60 });
    expect(getStartingStats("grinder", "technical")).toEqual({ rating: 62, form: 73, morale: 63 });
    expect(getStartingStats("oneVOne", "defense")).toEqual({ rating: 68, form: 68, morale: 58 });
    expect(getStartingStats("freestyler", "offense")).toEqual({ rating: 69, form: 50, morale: 78 });
  });

  it("weights the composite score by role", () => {
    const stats = { rating: 80, form: 60, morale: 40 };
    expect(computeComposite(stats, "offense")).toBeGreaterThan(computeComposite(stats, "defense"));
  });
});
