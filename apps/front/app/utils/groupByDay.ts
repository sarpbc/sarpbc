import { localDayKey, parseMatchDate } from "~/utils/calendarDay";

export const UNKNOWN_DAY_KEY = "__unknown__";

export interface DayGroup<T> {
  dateKey: string;
  date: Date | null;
  items: T[];
}

/** Items without a date go last in a group keyed `UNKNOWN_DAY_KEY`. */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => Date | string | null | undefined,
  order: "asc" | "desc",
): DayGroup<T>[] {
  const sign = order === "desc" ? -1 : 1;
  const timeOf = (item: T) => parseMatchDate(getDate(item))?.getTime() ?? 0;
  const unknown: T[] = [];
  const byDay = new Map<string, { date: Date; items: T[] }>();

  for (const item of items) {
    const date = parseMatchDate(getDate(item));
    if (!date) {
      unknown.push(item);
      continue;
    }

    const dateKey = localDayKey(date);
    const existing = byDay.get(dateKey);
    if (existing) {
      existing.items.push(item);
    } else {
      byDay.set(dateKey, { date, items: [item] });
    }
  }

  const groups: DayGroup<T>[] = [...byDay.entries()]
    .map(([dateKey, group]) => ({
      dateKey,
      date: group.date,
      items: group.items.sort((a, b) => sign * (timeOf(a) - timeOf(b))),
    }))
    .sort((a, b) => sign * (a.date!.getTime() - b.date!.getTime()));

  if (unknown.length > 0) {
    groups.push({ dateKey: UNKNOWN_DAY_KEY, date: null, items: unknown });
  }

  return groups;
}
