import { formatTimeAgo } from "@vueuse/core";
import type { UseTimeAgoMessages, UseTimeAgoUnit } from "@vueuse/core";

const RELATIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// VueUse switches to "last week" from 6 days; days must last the whole relative window.
const TIME_AGO_UNITS: UseTimeAgoUnit[] = [
  { max: 60_000, name: "second", value: 1000 },
  { max: 2_760_000, name: "minute", value: 60_000 },
  { max: 72_000_000, name: "hour", value: 3_600_000 },
  { max: RELATIVE_WINDOW_MS + 86_400_000, name: "day", value: 86_400_000 },
  { max: 2_419_200_000, name: "week", value: 604_800_000 },
  { max: 28_512_000_000, name: "month", value: 2_592_000_000 },
  { max: Number.POSITIVE_INFINITY, name: "year", value: 31_536_000_000 },
];

const pf = (past: boolean): string => (past ? ".past" : ".future");

export const formatLocaleTimeAgo = (date: Date) => {
  const { t, locale } = useI18n();

  const now = new Date();

  if (now.getTime() - date.getTime() > RELATIVE_WINDOW_MS) {
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

    if (date.getFullYear() !== now.getFullYear()) {
      options.year = "numeric";
    }

    return new Intl.DateTimeFormat(locale.value, options).format(date);
  }

  const messages: UseTimeAgoMessages = {
    day: (n, past) => {
      if (n !== 1) {
        return `${n} ${t(`timeAgo.day${pf(past)}`, n)}`;
      }

      return past ? t("timeAgo.yesterday") : t("timeAgo.tomorrow");
    },
    future: (n) => (/\d/u.test(n) ? t("timeAgo.in", [n]) : n),
    hour: (n, past) => `${n} ${t(`timeAgo.hour${pf(past)}`, n)}`,
    invalid: "",
    justNow: t("timeAgo.just-now"),
    minute: (n, past) => `${n} ${t(`timeAgo.minute${pf(past)}`, n)}`,
    month: (n, past) => {
      if (n !== 1) {
        return `${n} ${t(`timeAgo.month${pf(past)}`, n)}`;
      }

      return past ? t("timeAgo.last-month") : t("timeAgo.next-month");
    },
    past: (n) => (/\d/u.test(n) ? t("timeAgo.ago", [n]) : n),
    second: (n, past) => `${n} ${t(`timeAgo.second${pf(past)}`, n)}`,
    week: (n, past) => {
      if (n !== 1) {
        return `${n} ${t(`timeAgo.week${pf(past)}`, n)}`;
      }

      return past ? t("timeAgo.last-week") : t("timeAgo.next-week");
    },
    year: (n, past) => {
      if (n !== 1) {
        return `${n} ${t(`timeAgo.year${pf(past)}`, n)}`;
      }

      return past ? t("timeAgo.last-year") : t("timeAgo.next-year");
    },
  };

  return formatTimeAgo(date, {
    fullDateFormatter: (value) => value.toLocaleString(),
    messages,
    units: TIME_AGO_UNITS,
  });
};
