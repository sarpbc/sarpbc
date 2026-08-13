import type { CareerBackground, CareerRole, CareerStats } from "~/types/career";
import { MAX_STAT, MIN_STAT, getSeasonsPastPeak } from "~/types/career";

/** Full positive gains below this; each extra point costs more toward MAX_STAT. */
export const SOFT_STAT_CEILING = 85;

export function clampStat(value: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}

function gainCost(current: number): number {
  if (current < SOFT_STAT_CEILING) return 1;
  const t = (current - SOFT_STAT_CEILING) / (MAX_STAT - SOFT_STAT_CEILING);
  return 1 + 2 * t * t;
}

/**
 * Apply a single-stat change. Negative deltas apply in full; positive deltas
 * shrink as the value approaches MAX_STAT so 90+ is rare and 95 is exceptional.
 */
export function applyStatChange(current: number, delta: number): number {
  if (delta === 0) return clampStat(current);
  if (delta < 0) return clampStat(current + delta);

  let budget = delta;
  let value = current;
  while (budget > 0 && value < MAX_STAT) {
    const cost = gainCost(value);
    if (budget + 1e-9 < cost) break;
    value += 1;
    budget -= cost;
  }
  return clampStat(value);
}

export function applyStatDelta(stats: CareerStats, delta: Partial<CareerStats>): CareerStats {
  return {
    rating: applyStatChange(stats.rating, delta.rating ?? 0),
    form: applyStatChange(stats.form, delta.form ?? 0),
    morale: applyStatChange(stats.morale, delta.morale ?? 0),
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

/** Rating and form drop after the five peak seasons. Accelerates each year. */
export function getAgeDecline(season: number): Partial<CareerStats> {
  const pastPeak = getSeasonsPastPeak(season);
  if (pastPeak <= 0) return {};
  return {
    rating: -(1 + pastPeak),
    form: -pastPeak,
    morale: pastPeak >= 2 ? -1 : 0,
  };
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
