import { describe, expect, it } from "vitest";
import { MAX_STAT } from "~/types/career";
import {
  ELITE_STAT_CAP,
  applyStatChange,
  applyStatDelta,
  clampStat,
  computeComposite,
  computePerformance,
  getStartingStats,
} from "~/utils/career/stats";

const alwaysLucky = (): number => 0;
const neverLucky = (): number => 1;

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
      alwaysLucky,
    );
    expect(next.rating).toBe(ELITE_STAT_CAP);
    expect(next.form).toBe(ELITE_STAT_CAP);
    expect(next.morale).toBe(ELITE_STAT_CAP);
    expect(next.rating).toBeLessThan(MAX_STAT);
  });

  it("applies +1 through +5 in full under 80", () => {
    expect(applyStatChange(70, 1)).toBe(71);
    expect(applyStatChange(70, 2)).toBe(72);
    expect(applyStatChange(70, 3)).toBe(73);
    expect(applyStatChange(70, 5)).toBe(75);
    expect(applyStatChange(74, 5)).toBe(79);
    expect(applyStatChange(75, 5)).toBe(80);
  });

  it("starts shrinking gains after 80", () => {
    expect(applyStatChange(81, 5) - 81).toBeLessThan(5);
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

  it("reaches 95 from 94 with a large gain, but not a small one", () => {
    expect(applyStatChange(94, 1)).toBe(94);
    expect(applyStatChange(94, 5)).toBe(95);
  });

  it("can reach 100 from 99 only with a large gain and luck", () => {
    expect(applyStatChange(99, 5, alwaysLucky)).toBe(MAX_STAT);
    expect(applyStatChange(99, 5, neverLucky)).toBe(ELITE_STAT_CAP);
    expect(applyStatChange(99, 1, alwaysLucky)).toBe(ELITE_STAT_CAP);
    expect(applyStatChange(99, 3, alwaysLucky)).toBe(ELITE_STAT_CAP);
  });

  it("takes many large gains from 90 to even sit at 99", () => {
    let value = 90;
    for (let i = 0; i < 6; i++) {
      value = applyStatChange(value, 5, alwaysLucky);
    }
    expect(value).toBeGreaterThanOrEqual(96);
    expect(value).toBeLessThan(MAX_STAT);

    for (let i = 0; i < 8; i++) {
      value = applyStatChange(value, 5, neverLucky);
    }
    expect(value).toBe(ELITE_STAT_CAP);
    expect(applyStatChange(value, 5, neverLucky)).toBe(ELITE_STAT_CAP);
    expect(applyStatChange(value, 5, alwaysLucky)).toBe(MAX_STAT);
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

  it("lets form and morale move match strength with no role", () => {
    const rating = { rating: 80, form: 50, morale: 50 };
    const hot = { rating: 80, form: 90, morale: 80 };
    expect(computePerformance(hot)).toBeGreaterThan(computePerformance(rating));
    expect(computePerformance(hot, "offense")).toBeGreaterThan(
      computePerformance(rating, "offense"),
    );
  });
});
