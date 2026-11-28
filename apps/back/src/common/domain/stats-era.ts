import { OPEN_ERA_START } from "@sarpbc/types";
import type { StatsEra } from "@sarpbc/types";

const OPEN_ERA_START_TIME = Date.parse(OPEN_ERA_START);

const timeOf = (date: Date | string | null) =>
  date === null || date === "" ? null : new Date(date).getTime();

/** An undated item belongs to no era. */
export const isInEra = (date: Date | string | null, era: StatsEra) => {
  const time = timeOf(date);

  if (time === null) {
    return false;
  }

  switch (era) {
    case "open": {
      return time >= OPEN_ERA_START_TIME;
    }

    case "pre-open": {
      return time < OPEN_ERA_START_TIME;
    }

    default: {
      const exhaustive: never = era;

      return exhaustive;
    }
  }
};

/** Whether a period that runs from `start` to `end`, or is still running, overlaps the era. */
export const overlapsEra = (start: Date, end: Date | null, era: StatsEra) => {
  switch (era) {
    case "open": {
      return end === null || end.getTime() >= OPEN_ERA_START_TIME;
    }

    case "pre-open": {
      return start.getTime() < OPEN_ERA_START_TIME;
    }

    default: {
      const exhaustive: never = era;

      return exhaustive;
    }
  }
};
