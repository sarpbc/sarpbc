import type { CareerBackground, CareerRole, CareerStats } from "~/types/career";
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

function getBackgroundBaseStats(background: CareerBackground): CareerStats {
  switch (background) {
    case "prodigy":
      return { rating: 72, form: 55, morale: 60 };
    case "grinder":
      return { rating: 62, form: 70, morale: 65 };
    case "oneVOne":
      return { rating: 70, form: 68, morale: 55 };
    case "freestyler":
      return { rating: 66, form: 52, morale: 78 };
    default: {
      const _exhaustive: never = background;
      return _exhaustive;
    }
  }
}

function getRoleDelta(role: CareerRole): Partial<CareerStats> {
  switch (role) {
    case "offense":
      return { rating: 3, form: -2 };
    case "technical":
      return { form: 3, morale: -2 };
    case "defense":
      return { morale: 3, rating: -2 };
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function getStartingStats(background: CareerBackground, role: CareerRole): CareerStats {
  return applyStatDelta(getBackgroundBaseStats(background), getRoleDelta(role));
}

/** Composite performance score — role shifts how much each stat matters. */
export function computeComposite(stats: CareerStats, role: CareerRole): number {
  switch (role) {
    case "offense":
      return stats.rating * 0.55 + stats.form * 0.3 + stats.morale * 0.15;
    case "technical":
      return stats.rating * 0.5 + stats.form * 0.35 + stats.morale * 0.15;
    case "defense":
      return stats.rating * 0.45 + stats.form * 0.3 + stats.morale * 0.25;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
