import { formatTimeAgo, type UseTimeAgoMessages, type UseTimeAgoUnit } from "@vueuse/core";

const RELATIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// VueUse switches to "last week" from 6 days; days must last the whole relative window.
const TIME_AGO_UNITS: UseTimeAgoUnit[] = [
  { max: 60_000, value: 1000, name: "second" },
  { max: 2_760_000, value: 60_000, name: "minute" },
  { max: 72_000_000, value: 3_600_000, name: "hour" },
  { max: RELATIVE_WINDOW_MS + 86_400_000, value: 86_400_000, name: "day" },
  { max: 2_419_200_000, value: 604_800_000, name: "week" },
  { max: 28_512_000_000, value: 2_592_000_000, name: "month" },
  { max: Number.POSITIVE_INFINITY, value: 31_536_000_000, name: "year" },
];

export function formatLocaleTimeAgo(date: Date) {
  const { t, locale } = useI18n();

  const now = new Date();

  if (now.getTime() - date.getTime() > RELATIVE_WINDOW_MS) {
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

    if (date.getFullYear() !== now.getFullYear()) options.year = "numeric";

    return new Intl.DateTimeFormat(locale.value, options).format(date);
  }

  const pf = (past: boolean) => (past ? ".past" : ".future");

  const messages: UseTimeAgoMessages = {
    justNow: t("timeAgo.just-now"),
    past: (n) => (/\d/.test(n) ? t("timeAgo.ago", [n]) : n),
    future: (n) => (/\d/.test(n) ? t("timeAgo.in", [n]) : n),
    month: (n, past) =>
      n === 1
        ? past
          ? t("timeAgo.last-month")
          : t("timeAgo.next-month")
        : `${n} ${t(`timeAgo.month${pf(past)}`, n)}`,
    year: (n, past) =>
      n === 1
        ? past
          ? t("timeAgo.last-year")
          : t("timeAgo.next-year")
        : `${n} ${t(`timeAgo.year${pf(past)}`, n)}`,
    day: (n, past) =>
      n === 1
        ? past
          ? t("timeAgo.yesterday")
          : t("timeAgo.tomorrow")
        : `${n} ${t(`timeAgo.day${pf(past)}`, n)}`,
    week: (n, past) =>
      n === 1
        ? past
          ? t("timeAgo.last-week")
          : t("timeAgo.next-week")
        : `${n} ${t(`timeAgo.week${pf(past)}`, n)}`,
    hour: (n, past) => `${n} ${t(`timeAgo.hour${pf(past)}`, n)}`,
    minute: (n, past) => `${n} ${t(`timeAgo.minute${pf(past)}`, n)}`,
    second: (n, past) => `${n} ${t(`timeAgo.second${pf(past)}`, n)}`,
    invalid: "",
  };

  return formatTimeAgo(date, {
    fullDateFormatter: (date) => date.toLocaleString(),
    messages,
    units: TIME_AGO_UNITS,
  });
}
