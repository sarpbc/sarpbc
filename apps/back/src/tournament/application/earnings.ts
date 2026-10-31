import type { EarningsEntry, EarningsYear, PrizeAmount, ProfileEarnings } from "@sarpbc/types";
import { currencyFractionDigits } from "@sarpbc/utils";

export interface EarningsLine extends EarningsEntry {
  shares: number;
}

interface ShareLine {
  entry: EarningsEntry;
  minorUnits: number;
  year: number | null;
}

function minorUnitScale(currency: string): number {
  return 10 ** currencyFractionDigits(currency);
}

function totals(lines: ShareLine[]): PrizeAmount[] {
  const byCurrency = new Map<string, number>();
  for (const { entry, minorUnits } of lines)
    byCurrency.set(entry.currency, (byCurrency.get(entry.currency) ?? 0) + minorUnits);
  return [...byCurrency]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({ currency, amount: amount / minorUnitScale(currency) }));
}

function yearOf(entry: EarningsEntry): number | null {
  const date = entry.tournament.endAt ?? entry.tournament.beginAt;
  return date ? new Date(date).getUTCFullYear() : null;
}

export function summarizeEarnings(lines: EarningsLine[]): ProfileEarnings {
  const shares: ShareLine[] = lines.map(({ shares: count, ...entry }) => {
    const scale = minorUnitScale(entry.currency);
    const minorUnits = Math.round((entry.amount * scale) / Math.max(count, 1));
    return { entry: { ...entry, amount: minorUnits / scale }, minorUnits, year: yearOf(entry) };
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
