import { describe, expect, it } from "vitest";
import { MAX_STAT } from "~/types/career";
import {
  applyStatChange,
  applyStatDelta,
  clampStat,
  computeComposite,
  getStartingStats,
} from "~/utils/career/stats";

describe("career stats", () => {
  it("clamps values between 0 and MAX_STAT", () => {
    expect(clampStat(-5)).toBe(0);
    expect(clampStat(150)).toBe(MAX_STAT);
    expect(clampStat(100)).toBe(MAX_STAT);
    expect(clampStat(42.6)).toBe(43);
  });

  it("applies stat deltas in full below the soft ceiling", () => {
    const result = applyStatDelta({ rating: 50, form: 50, morale: 50 }, { rating: 10, form: -5 });
    expect(result).toEqual({ rating: 60, form: 45, morale: 50 });
  });

  it("does not let a large positive delta jump to 100", () => {
    const next = applyStatDelta(
      { rating: 90, form: 90, morale: 90 },
      { rating: 50, form: 50, morale: 50 },
    );
    expect(next.rating).toBe(MAX_STAT);
    expect(next.form).toBe(MAX_STAT);
    expect(next.morale).toBe(MAX_STAT);
    expect(next.rating).toBeLessThan(100);
  });

  it("makes high ratings harder than a linear clamp", () => {
    expect(applyStatChange(70, 5)).toBe(75);
    const highGain = applyStatChange(90, 5) - 90;
    expect(highGain).toBeGreaterThan(0);
    expect(highGain).toBeLessThan(5);
    expect(applyStatChange(90, 5)).toBeLessThan(MAX_STAT);
  });

  it("applies negative deltas in full even near the cap", () => {
    expect(applyStatChange(94, -5)).toBe(89);
  });

  it("can reach MAX_STAT from 94 with a large gain, but not a small one", () => {
    expect(applyStatChange(94, 1)).toBe(94);
    expect(applyStatChange(94, 5)).toBe(MAX_STAT);
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
