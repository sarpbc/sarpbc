import { describe, expect, it } from "vitest";
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";
import { getAirRiddleDateKey, parseAirRiddleStoredState } from "~/composables/useAirRiddleStorage";

describe("getAirRiddleDateKey", () => {
  it("returns YYYY-MM-DD in Europe/Berlin", () => {
    // 2026-07-20 23:30 UTC = 2026-07-21 01:30 Berlin (CEST)
    const lateUtc = new Date("2026-07-20T23:30:00.000Z");
    expect(getAirRiddleDateKey(lateUtc)).toBe("2026-07-21");

    // 2026-07-20 21:30 UTC = 2026-07-20 23:30 Berlin
    const earlierUtc = new Date("2026-07-20T21:30:00.000Z");
    expect(getAirRiddleDateKey(earlierUtc)).toBe("2026-07-20");
  });
});

describe("parseAirRiddleStoredState", () => {
  const today = "2026-07-20";

  it("returns null for a different day", () => {
    const raw = JSON.stringify({
      date: "2026-07-19",
      targetLength: 5,
      attempts: [],
      isWon: false,
      isGameOver: false,
    });
    expect(parseAirRiddleStoredState(raw, today)).toBeNull();
  });

  it("restores a valid today state", () => {
    const raw = JSON.stringify({
      date: today,
      targetLength: 4,
      attempts: [
        {
          letters: ["A", "B", "C", "D"],
          results: [
            AirRiddleResultEnum.CORRECT,
            AirRiddleResultEnum.MISPLACED,
            AirRiddleResultEnum.INCORRECT,
            AirRiddleResultEnum.CORRECT,
          ],
        },
      ],
      isWon: false,
      isGameOver: false,
      answer: undefined,
    });

    expect(parseAirRiddleStoredState(raw, today)).toEqual({
      date: today,
      targetLength: 4,
      attempts: [
        {
          letters: ["A", "B", "C", "D"],
          results: [
            AirRiddleResultEnum.CORRECT,
            AirRiddleResultEnum.MISPLACED,
            AirRiddleResultEnum.INCORRECT,
            AirRiddleResultEnum.CORRECT,
          ],
        },
      ],
      isWon: false,
      isGameOver: false,
    });
  });
});
