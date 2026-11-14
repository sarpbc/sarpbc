import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calendarDayIn, formatIsoDay, isMonthDay, parseIsoDay } from "./on-this-day";

void describe("on this day calendar", () => {
  void it("accepts every day of the year, February 29 included", () => {
    assert.equal(isMonthDay(2, 29), true);
    assert.equal(isMonthDay(12, 31), true);
    assert.equal(isMonthDay(4, 31), false);
    assert.equal(isMonthDay(13, 1), false);
    assert.equal(isMonthDay(1, 0), false);
    assert.equal(isMonthDay(1.5, 2), false);
  });

  void it("reads the calendar day in the site time zone", () => {
    assert.deepEqual(calendarDayIn(new Date("2024-06-30T22:30:00Z"), "Europe/Paris"), {
      day: 1,
      month: 7,
      year: 2024,
    });
    assert.deepEqual(calendarDayIn(new Date("2024-06-30T22:30:00Z"), "UTC"), {
      day: 30,
      month: 6,
      year: 2024,
    });
  });

  void it("parses and formats ISO days, refusing impossible dates", () => {
    assert.deepEqual(parseIsoDay("2024-02-29"), { day: 29, month: 2, year: 2024 });
    assert.equal(parseIsoDay("2023-02-29"), null);
    assert.equal(parseIsoDay("2024-2-9"), null);
    assert.equal(formatIsoDay({ day: 5, month: 3, year: 2024 }), "2024-03-05");
  });
});
