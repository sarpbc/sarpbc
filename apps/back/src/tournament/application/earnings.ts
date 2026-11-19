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

const minorUnitScale = (currency: string) => 10 ** currencyFractionDigits(currency);

const totals = (lines: ShareLine[]) => {
  const byCurrency = new Map<string, number>();

  for (const { entry, minorUnits } of lines) {
    byCurrency.set(entry.currency, (byCurrency.get(entry.currency) ?? 0) + minorUnits);
  }

  return [...byCurrency]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({
      amount: amount / minorUnitScale(currency),
      currency,
    })) satisfies PrizeAmount[];
};

const yearOf = (entry: EarningsEntry) => {
  const date = entry.tournament.endAt ?? entry.tournament.beginAt;

  return date !== null && date !== "" ? new Date(date).getUTCFullYear() : null;
};

export const summarizeEarnings = (lines: EarningsLine[]) => {
  const shares: ShareLine[] = lines.map(({ shares: count, ...entry }) => {
    const scale = minorUnitScale(entry.currency);
    const minorUnits = Math.round((entry.amount * scale) / Math.max(count, 1));

    return { entry: { ...entry, amount: minorUnits / scale }, minorUnits, year: yearOf(entry) };
  });

  const years = new Map<number | null, ShareLine[]>();

  for (const line of shares) {
    years.set(line.year, [...(years.get(line.year) ?? []), line]);
  }

  const grouped: EarningsYear[] = [...years]
    .toSorted(([a], [b]) => (b ?? -Infinity) - (a ?? -Infinity))
    .map(([year, yearLines]) => ({
      entries: yearLines.map(({ entry }) => entry),
      totals: totals(yearLines),
      year,
    }));

  return { totals: totals(shares), years: grouped } satisfies ProfileEarnings;
};
