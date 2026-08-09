import { describe, expect, it } from "vitest";
import { applyStatDelta, clampStat, getBackgroundStartingStats } from "~/utils/career/stats";

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

  it("returns background starting stats", () => {
    expect(getBackgroundStartingStats("prodigy").rating).toBe(72);
    expect(getBackgroundStartingStats("grinder").form).toBe(70);
    expect(getBackgroundStartingStats("wildcard").morale).toBe(80);
  });
});
