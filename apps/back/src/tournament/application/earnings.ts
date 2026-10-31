import type { EarningsEntry, EarningsYear, PrizeAmount, ProfileEarnings } from "@sarpbc/types";

export interface EarningsLine extends EarningsEntry {
  shares: number;
}

interface ShareLine {
  entry: EarningsEntry;
  cents: number;
  year: number | null;
}

function totals(lines: ShareLine[]): PrizeAmount[] {
  const byCurrency = new Map<string, number>();
  for (const { entry, cents } of lines)
    byCurrency.set(entry.currency, (byCurrency.get(entry.currency) ?? 0) + cents);
  return [...byCurrency]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({ currency, amount: amount / 100 }));
}

function yearOf(entry: EarningsEntry): number | null {
  const date = entry.tournament.endAt ?? entry.tournament.beginAt;
  return date ? new Date(date).getUTCFullYear() : null;
}

export function summarizeEarnings(lines: EarningsLine[]): ProfileEarnings {
  const shares: ShareLine[] = lines.map(({ shares: count, ...entry }) => {
    const cents = Math.round((entry.amount * 100) / Math.max(count, 1));
    return { entry: { ...entry, amount: cents / 100 }, cents, year: yearOf(entry) };
  });
  const years = new Map<number | null, ShareLine[]>();
  for (const line of shares) years.set(line.year, [...(years.get(line.year) ?? []), line]);
  const grouped: EarningsYear[] = [...years]
    .sort(([a], [b]) => (b ?? -Infinity) - (a ?? -Infinity))
    .map(([year, yearLines]) => ({
      year,
      totals: totals(yearLines),
      entries: yearLines.map(({ entry }) => entry),
    }));
  return { totals: totals(shares), years: grouped };
}
