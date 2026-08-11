/** Local calendar-day helpers (timezone = runtime default). */

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function localDayKey(date: Date): string {
  return startOfLocalDay(date).toDateString();
}

export function parseMatchDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysFromToday(date: Date, now: Date = new Date()): number {
  const today = startOfLocalDay(now).getTime();
  const target = startOfLocalDay(date).getTime();
  return Math.round((target - today) / 86_400_000);
}

/** True when the match begins today or tomorrow (local calendar). */
export function isTodayOrTomorrow(date: Date, now: Date = new Date()): boolean {
  const offset = daysFromToday(date, now);
  return offset >= 0 && offset <= 1;
}

type MatchWithBeginAt = {
  beginAt?: Date | string | null;
};

/** Keep upcoming rail rows to today/tomorrow only. */
export function filterMatchesTodayOrTomorrow<T extends MatchWithBeginAt>(
  matches: T[],
  now: Date = new Date(),
): T[] {
  return matches.filter((match) => {
    const beginAt = parseMatchDate(match.beginAt);
    return beginAt != null && isTodayOrTomorrow(beginAt, now);
  });
}
