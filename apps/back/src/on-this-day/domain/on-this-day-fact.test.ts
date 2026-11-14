import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { isFactShownOn, parseOnThisDayFact } from "./on-this-day-fact";
import type { OnThisDayFactFields } from "./on-this-day-fact";

const input: OnThisDayFactFields = {
  day: 7,
  link: null,
  month: 7,
  sourceUrl: " https://www.rocketleague.com/news ",
  textEn: "  Rocket League was released.  ",
  textFr: "Rocket League sortait.",
  year: 2015,
};

describe(parseOnThisDayFact, () => {
  it("trims the staff-written texts and the source", () => {
    expect(parseOnThisDayFact(input)).toStrictEqual({
      ...input,
      sourceUrl: "https://www.rocketleague.com/news",
      textEn: "Rocket League was released.",
    });
  });

  it("keeps an optional year and source", () => {
    expect(parseOnThisDayFact({ ...input, sourceUrl: "  ", year: null })).toMatchObject({
      sourceUrl: null,
      year: null,
    });
  });

  it.each([
    "https://liquipedia.net/rocketleague/RLCS",
    "https://www.LIQUIPEDIA.net/rocketleague",
    "https://blast.tv/rl/tournaments",
    "https://www.blast.tv/news",
  ])("refuses %s as a source", (sourceUrl) => {
    expect(() => parseOnThisDayFact({ ...input, sourceUrl })).toThrow(/not accepted sources/u);
  });

  it.each([
    ["an impossible day", { day: 31, month: 4 }],
    ["February 29 of a common year", { day: 29, month: 2, year: 2023 }],
    ["a year before Rocket League's predecessor", { year: 1999 }],
    ["an empty French text", { textFr: "   " }],
    ["a non-http source", { sourceUrl: "ftp://example.com/fact" }],
  ])("refuses %s", (_label, overrides) => {
    expect(() => parseOnThisDayFact({ ...input, ...overrides })).toThrow(InvalidInputError);
  });

  it("accepts February 29 without a year or in a leap year", () => {
    expect(parseOnThisDayFact({ ...input, day: 29, month: 2, year: null }).day).toBe(29);
    expect(parseOnThisDayFact({ ...input, day: 29, month: 2, year: 2024 }).year).toBe(2024);
  });
});

describe(isFactShownOn, () => {
  const on = { day: 7, month: 7, year: 2026 };

  it("matches the month and day of any past year or of no year", () => {
    expect(isFactShownOn({ day: 7, month: 7, year: 2015 }, on)).toBe(true);
    expect(isFactShownOn({ day: 7, month: 7, year: null }, on)).toBe(true);
    expect(isFactShownOn({ day: 7, month: 7, year: 2026 }, on)).toBe(true);
  });

  it("hides another day and a fact dated in a future year", () => {
    expect(isFactShownOn({ day: 8, month: 7, year: 2015 }, on)).toBe(false);
    expect(isFactShownOn({ day: 7, month: 8, year: 2015 }, on)).toBe(false);
    expect(isFactShownOn({ day: 7, month: 7, year: 2027 }, on)).toBe(false);
  });
});
