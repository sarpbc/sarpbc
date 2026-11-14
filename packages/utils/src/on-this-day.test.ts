import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calendarDayIn, formatIsoDay, isMonthDay, parseIsoDay } from "./on-this-day";

describe("on this day calendar", () => {
  it("accepts every day of the year, February 29 included", () => {
    assert.equal(isMonthDay(2, 29), true);
    assert.equal(isMonthDay(12, 31), true);
    assert.equal(isMonthDay(4, 31), false);
    assert.equal(isMonthDay(13, 1), false);
    assert.equal(isMonthDay(1, 0), false);
    assert.equal(isMonthDay(1.5, 2), false);
  });

  it("reads the calendar day in the site time zone", () => {
    assert.deepEqual(calendarDayIn(new Date("2024-06-30T22:30:00Z"), "Europe/Paris"), {
      year: 2024,
      month: 7,
      day: 1,
    });
    assert.deepEqual(calendarDayIn(new Date("2024-06-30T22:30:00Z"), "UTC"), {
      year: 2024,
      month: 6,
      day: 30,
    });
  });

  it("parses and formats ISO days, refusing impossible dates", () => {
    assert.deepEqual(parseIsoDay("2024-02-29"), { year: 2024, month: 2, day: 29 });
    assert.equal(parseIsoDay("2023-02-29"), null);
    assert.equal(parseIsoDay("2024-2-9"), null);
    assert.equal(formatIsoDay({ year: 2024, month: 3, day: 5 }), "2024-03-05");
  });
});
