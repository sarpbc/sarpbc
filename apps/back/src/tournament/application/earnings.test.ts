import { describe, expect, it } from "vitest";
import { summarizeEarnings } from "./earnings";
import type { EarningsLine } from "./earnings";

const line = (
  id: string,
  amount: number,
  currency: string,
  endAt: string | null,
  shares = 1,
): EarningsLine => ({
  amount,
  currency,
  id,
  placement: 1,
  shares,
  team: { id: "team-a", name: "Team A", slug: "team-a" },
  tournament: {
    beginAt: null,
    endAt,
    event: { id: "e1", name: "Fake Cup", slug: "fake-cup" },
    id: `t-${id}`,
    name: "Main Event",
    slug: "main-event",
    source: "manual",
  },
});

describe(summarizeEarnings, () => {
  it("totals each currency separately without converting", () => {
    const earnings = summarizeEarnings([
      line("a", 1000, "USD", "2026-05-01T00:00:00Z"),
      line("b", 500, "EUR", "2026-03-01T00:00:00Z"),
      line("c", 250, "USD", "2025-12-31T23:00:00Z"),
    ]);

    expect(earnings.totals).toStrictEqual([
      { amount: 500, currency: "EUR" },
      { amount: 1250, currency: "USD" },
    ]);
    expect(earnings.years.map(({ year, totals }) => ({ totals, year }))).toStrictEqual([
      {
        totals: [
          { amount: 500, currency: "EUR" },
          { amount: 1000, currency: "USD" },
        ],
        year: 2026,
      },
      { totals: [{ amount: 250, currency: "USD" }], year: 2025 },
    ]);
  });

  it("splits a prize equally between its listed players to the cent", () => {
    const earnings = summarizeEarnings([
      line("a", 1000, "USD", "2026-05-01T00:00:00Z", 3),
      line("b", 1000, "USD", "2026-06-01T00:00:00Z", 3),
    ]);

    expect(earnings.years[0]?.entries.map(({ amount }) => amount)).toStrictEqual([333.33, 333.33]);
    expect(earnings.totals).toStrictEqual([{ amount: 666.66, currency: "USD" }]);
  });

  it("rounds shares to the minor unit of each currency", () => {
    const earnings = summarizeEarnings([
      line("a", 1000, "JPY", "2026-05-01T00:00:00Z", 3),
      line("b", 1000, "KRW", "2026-05-01T00:00:00Z", 3),
      line("c", 1000, "KWD", "2026-05-01T00:00:00Z", 3),
    ]);

    expect(earnings.years[0]?.entries.map(({ amount }) => amount)).toStrictEqual([
      333, 333, 333.333,
    ]);
    expect(earnings.totals).toStrictEqual([
      { amount: 333, currency: "JPY" },
      { amount: 333, currency: "KRW" },
      { amount: 333.333, currency: "KWD" },
    ]);
  });

  it("groups undated tournaments last", () => {
    const earnings = summarizeEarnings([
      line("a", 100, "USD", null),
      line("b", 100, "USD", "2024-01-01T00:00:00Z"),
    ]);

    expect(earnings.years.map(({ year }) => year)).toStrictEqual([2024, null]);
  });
});
