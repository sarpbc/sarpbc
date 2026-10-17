import { describe, expect, it } from "vitest";
import { formatIsoWeekId, isoWeekIdFromDate, isoWeekUtcRange, parseIsoWeekId } from "@sarpbc/utils";

describe("parseIsoWeekId", () => {
  it("accepts padded ISO week ids", () => {
    expect(parseIsoWeekId("2026-W36")).toEqual({ year: 2026, week: 36 });
    expect(parseIsoWeekId("2026-W01")).toEqual({ year: 2026, week: 1 });
  });

  it("rejects malformed ids", () => {
    expect(parseIsoWeekId("2026-36")).toBeNull();
    expect(parseIsoWeekId("2026-W00")).toBeNull();
    expect(parseIsoWeekId("2026-W54")).toBeNull();
  });
});

describe("isoWeekIdFromDate", () => {
  it("assigns Thursday 1 Jan 2026 to week 1", () => {
    expect(isoWeekIdFromDate(new Date("2026-01-01T12:00:00.000Z"))).toBe("2026-W01");
  });

  it("assigns the Monday before 1 Jan 2026 to week 1 of 2026", () => {
    expect(isoWeekIdFromDate(new Date("2025-12-29T00:00:00.000Z"))).toBe("2026-W01");
  });

  it("assigns Sunday 6 Sep 2026 to week 36", () => {
    expect(isoWeekIdFromDate(new Date("2026-09-06T14:00:00.000Z"))).toBe("2026-W36");
  });
});

describe("isoWeekUtcRange", () => {
  it("returns Monday 00:00 UTC through next Monday for week 36 of 2026", () => {
    const range = isoWeekUtcRange("2026-W36");
    expect(range?.start.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(range?.end.toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("rejects weeks that do not exist in that ISO year", () => {
    expect(isoWeekUtcRange("2024-W53")).toBeNull();
  });

  it("round-trips formatIsoWeekId", () => {
    expect(formatIsoWeekId(2026, 6)).toBe("2026-W06");
  });
});
