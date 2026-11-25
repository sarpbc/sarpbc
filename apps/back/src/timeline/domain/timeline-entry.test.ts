import type { TimelineEntryInput } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { parseTimelineEntry } from "./timeline-entry";

const input: TimelineEntryInput = {
  date: "2023-09-06",
  kind: "patch",
  nameEn: "  Season 8 begins  ",
  nameFr: "Début de la saison 8",
  noteEn: "  Ranked rewards are reset.  ",
  noteFr: "Les récompenses classées sont réinitialisées.",
  sourceUrl: " https://www.rocketleague.com/news ",
};

describe(parseTimelineEntry, () => {
  it("trims the staff-written texts and the source", () => {
    expect(parseTimelineEntry(input)).toStrictEqual({
      ...input,
      nameEn: "Season 8 begins",
      noteEn: "Ranked rewards are reset.",
      sourceUrl: "https://www.rocketleague.com/news",
    });
  });

  it.each([
    ["an impossible calendar date", { date: "2023-02-30" }],
    ["a date that is not ISO", { date: "06/09/2023" }],
    ["a date before 2016", { date: "2015-12-31" }],
    ["an empty English name", { nameEn: "   " }],
    ["a name over 80 characters", { nameFr: "x".repeat(81) }],
    ["an empty note", { noteFr: "" }],
    ["a note over 500 characters", { noteEn: "x".repeat(501) }],
    ["a blank source", { sourceUrl: "  " }],
    ["a non-http source", { sourceUrl: "ftp://example.com/patch" }],
    ["a Liquipedia source", { sourceUrl: "https://liquipedia.net/rocketleague/RLCS" }],
    ["a BLAST.tv source", { sourceUrl: "https://blast.tv/rl/news" }],
  ])("refuses %s", (_label, overrides) => {
    expect(() => parseTimelineEntry({ ...input, ...overrides })).toThrow(InvalidInputError);
  });

  it("accepts the first day of 2016 and a leap day", () => {
    expect(parseTimelineEntry({ ...input, date: "2016-01-01" }).date).toBe("2016-01-01");
    expect(parseTimelineEntry({ ...input, date: "2024-02-29" }).date).toBe("2024-02-29");
  });
});
