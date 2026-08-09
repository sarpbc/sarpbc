import type { CareerStats } from "~/types/career";
import { MAX_STAT, MIN_STAT } from "~/types/career";

export function clampStat(value: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}

export function applyStatDelta(stats: CareerStats, delta: Partial<CareerStats>): CareerStats {
  return {
    rating: clampStat(stats.rating + (delta.rating ?? 0)),
    form: clampStat(stats.form + (delta.form ?? 0)),
    morale: clampStat(stats.morale + (delta.morale ?? 0)),
  };
}

export function getBackgroundStartingStats(
  background: import("~/types/career").CareerBackground,
): CareerStats {
  switch (background) {
    case "prodigy":
      return { rating: 72, form: 55, morale: 60 };
    case "grinder":
      return { rating: 62, form: 70, morale: 65 };
    case "wildcard":
      return { rating: 58, form: 50, morale: 80 };
    default: {
      const _exhaustive: never = background;
      return _exhaustive;
    }
  }
}
