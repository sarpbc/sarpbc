import { DateFormatter } from "@internationalized/date";

export const longDateTimeFormatter = (locale: string) =>
  new DateFormatter(locale, {
    dateStyle: "long",
    timeStyle: "short",
  });

export const mediumDateFormatter = (locale: string) =>
  new DateFormatter(locale, { dateStyle: "medium" });

const dayHeaderFormatter = (locale: string) =>
  new DateFormatter(locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });

export const formatDayHeaderDate = (date: Date, locale: string): string => {
  const formatted = dayHeaderFormatter(locale).format(date);

  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
};

export const mediumCalendarDayFormatter = (locale: string) =>
  new DateFormatter(locale, { dateStyle: "medium", timeZone: "UTC" });
