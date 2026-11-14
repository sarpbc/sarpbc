import { isNonEmptyDateInput } from "@sarpbc/utils";

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const localDayKey = (date: Date): string => startOfLocalDay(date).toDateString();

export const parseMatchDate = (value: Date | string | null | undefined): Date | null => {
  if (!isNonEmptyDateInput(value)) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const daysFromToday = (date: Date, now: Date = new Date()): number => {
  const today = startOfLocalDay(now).getTime();
  const target = startOfLocalDay(date).getTime();

  return Math.round((target - today) / 86_400_000);
};

const isTodayOrTomorrow = (date: Date, now: Date = new Date()): boolean => {
  const offset = daysFromToday(date, now);

  return offset >= 0 && offset <= 1;
};

interface MatchWithBeginAt {
  beginAt?: Date | string | null;
}

export const filterMatchesTodayOrTomorrow = <T extends MatchWithBeginAt>(
  matches: T[],
  now: Date = new Date(),
): T[] =>
  matches.filter((match) => {
    const beginAt = parseMatchDate(match.beginAt);

    return beginAt !== null && beginAt !== undefined && isTodayOrTomorrow(beginAt, now);
  });
