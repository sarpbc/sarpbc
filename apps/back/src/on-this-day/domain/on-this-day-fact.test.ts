import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { isFactShownOn, parseOnThisDayFact, type OnThisDayFactFields } from "./on-this-day-fact";

const input: OnThisDayFactFields = {
  month: 7,
  day: 7,
  year: 2015,
  textEn: "  Rocket League was released.  ",
  textFr: "Rocket League sortait.",
  link: null,
  sourceUrl: " https://www.rocketleague.com/news ",
};

describe(parseOnThisDayFact, () => {
  it("trims the staff-written texts and the source", () => {
    expect(parseOnThisDayFact(input)).toStrictEqual({
      ...input,
      textEn: "Rocket League was released.",
      sourceUrl: "https://www.rocketleague.com/news",
    });
  });

  it("keeps an optional year and source", () => {
    expect(parseOnThisDayFact({ ...input, year: null, sourceUrl: "  " })).toMatchObject({
      year: null,
      sourceUrl: null,
    });
  });

  it.each([
    "https://liquipedia.net/rocketleague/RLCS",
    "https://www.LIQUIPEDIA.net/rocketleague",
    "https://blast.tv/rl/tournaments",
    "https://www.blast.tv/news",
  ])("refuses %s as a source", (sourceUrl) => {
    expect(() => parseOnThisDayFact({ ...input, sourceUrl })).toThrow(/not accepted sources/);
  });

  it.each([
    ["an impossible day", { month: 4, day: 31 }],
    ["February 29 of a common year", { month: 2, day: 29, year: 2023 }],
    ["a year before Rocket League's predecessor", { year: 1999 }],
    ["an empty French text", { textFr: "   " }],
    ["a non-http source", { sourceUrl: "ftp://example.com/fact" }],
  ])("refuses %s", (_label, overrides) => {
    expect(() => parseOnThisDayFact({ ...input, ...overrides })).toThrow(InvalidInputError);
  });

  it("accepts February 29 without a year or in a leap year", () => {
    expect(parseOnThisDayFact({ ...input, month: 2, day: 29, year: null }).day).toBe(29);
    expect(parseOnThisDayFact({ ...input, month: 2, day: 29, year: 2024 }).year).toBe(2024);
  });
});

describe(isFactShownOn, () => {
  const on = { year: 2026, month: 7, day: 7 };

  it("matches the month and day of any past year or of no year", () => {
    expect(isFactShownOn({ month: 7, day: 7, year: 2015 }, on)).toBe(true);
    expect(isFactShownOn({ month: 7, day: 7, year: null }, on)).toBe(true);
    expect(isFactShownOn({ month: 7, day: 7, year: 2026 }, on)).toBe(true);
  });

  it("hides another day and a fact dated in a future year", () => {
    expect(isFactShownOn({ month: 7, day: 8, year: 2015 }, on)).toBe(false);
    expect(isFactShownOn({ month: 8, day: 7, year: 2015 }, on)).toBe(false);
    expect(isFactShownOn({ month: 7, day: 7, year: 2027 }, on)).toBe(false);
  });
});
