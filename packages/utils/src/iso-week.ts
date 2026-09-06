export const ISO_WEEK_ID_PATTERN = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/;

export type IsoWeekId = {
  year: number;
  week: number;
};

const MS_PER_DAY = 86_400_000;

export function parseIsoWeekId(weekId: string): IsoWeekId | null {
  const match = ISO_WEEK_ID_PATTERN.exec(weekId);
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), week: Number(match[2]) };
}

export function formatIsoWeekId(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function isoWeekIdFromDate(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return formatIsoWeekId(isoYear, week);
}

export function isoWeekUtcRange(weekId: string): { start: Date; end: Date } | null {
  const parsed = parseIsoWeekId(weekId);
  if (!parsed) {
    return null;
  }
  const jan4 = new Date(Date.UTC(parsed.year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (parsed.week - 1) * 7);
  if (isoWeekIdFromDate(start) !== formatIsoWeekId(parsed.year, parsed.week)) {
    return null;
  }
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}
