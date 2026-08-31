import { describe, expect, it } from "vitest";
import { df, formatDayHeaderDate } from "./dateFormatter";

describe("df", () => {
  const date = new Date(2026, 6, 25, 14, 6);

  it("uses the full French month name", () => {
    const formatted = df("fr").format(date);
    expect(formatted).toContain("juillet");
    expect(formatted).not.toMatch(/juil\./);
  });
});

describe("formatDayHeaderDate", () => {
  it("capitalizes the French weekday", () => {
    expect(formatDayHeaderDate(new Date(2026, 8, 15), "fr")).toBe("Mardi 15 septembre 2026");
  });
});
