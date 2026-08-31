import { DateFormatter } from "@internationalized/date";

export const df = (locale: "fr" | "en" = "en") =>
  new DateFormatter(locale, {
    dateStyle: "long",
    timeStyle: "short",
  });

const dayHeaderFormatter = (locale: string) =>
  new DateFormatter(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function formatDayHeaderDate(date: Date, locale: string): string {
  const formatted = dayHeaderFormatter(locale).format(date);
  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
}
