import { DateFormatter } from "@internationalized/date";

export const df = (locale: "fr" | "en" = "en") =>
  new DateFormatter(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
