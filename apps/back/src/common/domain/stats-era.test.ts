import { describe, expect, it } from "vitest";
import { isInEra, overlapsEra } from "./stats-era";

describe(isInEra, () => {
  it.each([
    ["2020-08-01T00:00:00.000Z", "open", true],
    ["2020-07-31T23:59:59.000Z", "open", false],
    ["2020-07-31T23:59:59.000Z", "pre-open", true],
    ["2020-08-01T00:00:00.000Z", "pre-open", false],
  ] as const)("places %s in the %s era: %s", (date, era, expected) => {
    expect(isInEra(date, era)).toBe(expected);
  });

  it("keeps an undated item out of every era", () => {
    expect(isInEra(null, "open")).toBe(false);
    expect(isInEra(null, "pre-open")).toBe(false);
  });
});

describe(overlapsEra, () => {
  const before = new Date("2019-01-01T00:00:00.000Z");
  const after = new Date("2021-01-01T00:00:00.000Z");

  it("places a period across the Open era start in both eras", () => {
    expect(overlapsEra(before, after, "open")).toBe(true);
    expect(overlapsEra(before, after, "pre-open")).toBe(true);
  });

  it("places a running period in the Open era", () => {
    expect(overlapsEra(after, null, "open")).toBe(true);
    expect(overlapsEra(after, null, "pre-open")).toBe(false);
  });

  it("keeps a period that ended before the Open era out of it", () => {
    expect(overlapsEra(before, before, "open")).toBe(false);
  });
});
