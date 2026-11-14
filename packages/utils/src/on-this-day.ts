export const SITE_TIME_ZONE = "Europe/Paris";
export const ON_THIS_DAY_TEXT_MAX_LENGTH = 280;
export const ON_THIS_DAY_SOURCE_URL_MAX_LENGTH = 2048;
export const ON_THIS_DAY_MIN_YEAR = 2008;

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const ISO_DAY = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

export const isMonthDay = (month: number, day: number): boolean => {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12) {
    return false;
  }

  return day >= 1 && day <= (DAYS_IN_MONTH[month - 1] ?? 0);
};

export const calendarDayIn = (date: Date, timeZone: string): CalendarDay => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const part = (type: "year" | "month" | "day") =>
    Number(parts.find((entry) => entry.type === type)?.value);

  return { year: part("year"), month: part("month"), day: part("day") };
};

export const parseIsoDay = (value: string): CalendarDay | null => {
  const match = ISO_DAY.exec(value);

  if (!match) {
    return null;
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day }
    : null;
};

export const formatIsoDay = ({ year, month, day }: CalendarDay): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
