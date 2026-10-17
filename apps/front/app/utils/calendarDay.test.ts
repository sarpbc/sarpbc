import { describe, expect, it } from "vitest";
import { filterMatchesTodayOrTomorrow, isTodayOrTomorrow } from "./calendarDay";

describe("isTodayOrTomorrow", () => {
  const now = new Date("2026-08-11T15:00:00");

  it("accepts today and tomorrow", () => {
    expect(isTodayOrTomorrow(new Date("2026-08-11T20:00:00"), now)).toBe(true);
    expect(isTodayOrTomorrow(new Date("2026-08-12T11:00:00"), now)).toBe(true);
  });

  it("rejects later and past days", () => {
    expect(isTodayOrTomorrow(new Date("2026-08-13T11:00:00"), now)).toBe(false);
    expect(isTodayOrTomorrow(new Date("2026-08-10T11:00:00"), now)).toBe(false);
  });
});

describe("filterMatchesTodayOrTomorrow", () => {
  const now = new Date("2026-08-11T15:00:00");

  it("keeps only today and tomorrow matches", () => {
    const matches = [
      { id: "1", beginAt: new Date("2026-08-11T20:00:00") },
      { id: "2", beginAt: new Date("2026-08-12T11:00:00") },
      { id: "3", beginAt: new Date("2026-08-13T11:00:00") },
      { id: "4", beginAt: null },
    ];

    expect(filterMatchesTodayOrTomorrow(matches, now).map((m) => m.id)).toEqual(["1", "2"]);
  });
});
