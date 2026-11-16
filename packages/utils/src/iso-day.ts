import { parseIsoDay } from "./on-this-day";

export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

const zoneOffsetMs = (at: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    minute: "numeric",
    month: "numeric",
    second: "numeric",
    timeZone,
    year: "numeric",
  }).formatToParts(at);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value);

  const wallClock = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );

  return wallClock - Math.floor(at / 1000) * 1000;
};

/** The offset is read twice because the next midnight may sit on the other side of a DST change. */
export const endOfIsoDayIn = (value: string, timeZone: string): Date | null => {
  const day = parseIsoDay(value);

  if (!day) {
    return null;
  }

  const nextMidnight = Date.UTC(day.year, day.month - 1, day.day + 1);
  const estimate = nextMidnight - zoneOffsetMs(nextMidnight, timeZone);

  return new Date(nextMidnight - zoneOffsetMs(estimate, timeZone) - 1);
};
