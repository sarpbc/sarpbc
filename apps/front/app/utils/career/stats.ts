import type { CareerBackground, CareerRole, CareerStats } from "~/types/career";
import { MAX_STAT, MIN_STAT, getSeasonsPastPeak } from "~/types/career";

/** Full +1/+2/+3/+5 below this. Seasons are short; 80+ is where gains shrink. */
export const SOFT_STAT_CEILING = 80;

/**
 * Diminishing returns stop here. 100 is not bought with leftover budget —
 * it needs {@link MYTHIC_STAT_MIN_DELTA} and a {@link MYTHIC_STAT_CHANCE} roll.
 */
export const ELITE_STAT_CAP = MAX_STAT - 1;

/** Raw positive delta required to attempt 99 → 100. */
export const MYTHIC_STAT_MIN_DELTA = 4;

/** Chance to convert 99 → 100 when the delta is large enough (~1/20 of attempts). */
export const MYTHIC_STAT_CHANCE = 0.05;

export type StatRng = () => number;

function denyMythicRoll(): number {
  return 1;
}

export function clampStat(value: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}

/**
 * Quadratic cost from 80. Capped at 5 so a +5 can still buy a point in the
 * 90s; 100 stays behind the mythic roll.
 */
function gainCost(current: number): number {
  if (current < SOFT_STAT_CEILING) return 1;
  const over = current - SOFT_STAT_CEILING;
  return Math.min(5, 1 + (over * over) / 50);
}

/**
 * Apply a single-stat change. Negative deltas apply in full. Positive deltas
 * of +1 through +5 land in full under 80, then shrink so 94–96 is already rare,
 * 97–99 is elite, and 100 needs both a large raw gain at 99 and a 5% roll.
 */
export function applyStatChange(
  current: number,
  delta: number,
  rng: StatRng = denyMythicRoll,
): number {
  if (delta === 0) return clampStat(current);
  if (delta < 0) return clampStat(current + delta);

  let budget = delta;
  let value = current;
  while (budget > 0 && value < ELITE_STAT_CAP) {
    const cost = gainCost(value);
    if (budget + 1e-9 < cost) break;
    value += 1;
    budget -= cost;
  }

  if (current >= ELITE_STAT_CAP && delta >= MYTHIC_STAT_MIN_DELTA && rng() < MYTHIC_STAT_CHANCE) {
    return MAX_STAT;
  }
  return clampStat(value);
}

export function applyStatDelta(
  stats: CareerStats,
  delta: Partial<CareerStats>,
  rng: StatRng = denyMythicRoll,
): CareerStats {
  return {
    rating: applyStatChange(stats.rating, delta.rating ?? 0, rng),
    form: applyStatChange(stats.form, delta.form ?? 0, rng),
    morale: applyStatChange(stats.morale, delta.morale ?? 0, rng),
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

/** Rating and form drop after the peak seasons (age 22). Accelerates each year. */
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

/** Match strength for a player. NPCs have no role, so form/morale share a flat split. */
export function computePerformance(stats: CareerStats, role?: CareerRole | null): number {
  if (role) return computeComposite(stats, role);
  return stats.rating * 0.5 + stats.form * 0.3 + stats.morale * 0.2;
}
