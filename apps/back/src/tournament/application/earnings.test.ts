import { describe, expect, it } from "vitest";
import { summarizeEarnings, type EarningsLine } from "./earnings";

function line(
  id: string,
  amount: number,
  currency: string,
  endAt: string | null,
  shares = 1,
): EarningsLine {
  return {
    id,
    placement: 1,
    amount,
    currency,
    shares,
    team: { id: "team-a", name: "Team A", slug: "team-a" },
    tournament: {
      id: `t-${id}`,
      name: "Main Event",
      slug: "main-event",
      source: "manual",
      beginAt: null,
      endAt,
      event: { id: "e1", slug: "fake-cup", name: "Fake Cup" },
    },
  };
}

describe("summarizeEarnings", () => {
  it("totals each currency separately without converting", () => {
    const earnings = summarizeEarnings([
      line("a", 1000, "USD", "2026-05-01T00:00:00Z"),
      line("b", 500, "EUR", "2026-03-01T00:00:00Z"),
      line("c", 250, "USD", "2025-12-31T23:00:00Z"),
    ]);

    expect(earnings.totals).toEqual([
      { currency: "EUR", amount: 500 },
      { currency: "USD", amount: 1250 },
    ]);
    expect(earnings.years.map(({ year, totals }) => ({ year, totals }))).toEqual([
      {
        year: 2026,
        totals: [
          { currency: "EUR", amount: 500 },
          { currency: "USD", amount: 1000 },
        ],
      },
      { year: 2025, totals: [{ currency: "USD", amount: 250 }] },
    ]);
  });

  it("splits a prize equally between its listed players to the cent", () => {
    const earnings = summarizeEarnings([
      line("a", 1000, "USD", "2026-05-01T00:00:00Z", 3),
      line("b", 1000, "USD", "2026-06-01T00:00:00Z", 3),
    ]);

    expect(earnings.years[0]?.entries.map(({ amount }) => amount)).toEqual([333.33, 333.33]);
    expect(earnings.totals).toEqual([{ currency: "USD", amount: 666.66 }]);
  });

  it("groups undated tournaments last", () => {
    const earnings = summarizeEarnings([
      line("a", 100, "USD", null),
      line("b", 100, "USD", "2024-01-01T00:00:00Z"),
    ]);

    expect(earnings.years.map(({ year }) => year)).toEqual([2024, null]);
  });
});
