import {
  getSeasonsPastPeak,
  USER_ROSTER_ID,
  type CareerEventChoiceDefinition,
  type CareerState,
  type CareerStats,
} from "~/types/career";
import { getRosterPlayerRating, getRosterStrength } from "~/utils/career/roster";
import { createRng, hashString } from "~/utils/career/rng";

/** Typical live roster strength across the world field. */
export const WORLD_STRENGTH_BASELINE = 75;

const MAX_FAILURE_CHANCE = 0.45;
const MIN_RATING_MALUS = 1;
const MAX_RATING_MALUS = 3;

export interface EventOutcomeContext {
  careerId: string;
  eventId: string;
  choiceId: string;
  season: number;
  authoredDelta: Partial<CareerStats>;
  teamStrength: number;
  teammateRatings: readonly number[];
  lastSplitPoints: number | null;
  missedWorldsLastSeason: boolean;
  quitLeaning: number;
}

export interface ResolvedEventOutcome {
  delta: Partial<CareerStats>;
  failed: boolean;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return WORLD_STRENGTH_BASELINE;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function gapChance(gap: number, scale: number, cap: number): number {
  return Math.min(cap, Math.max(0, gap) / scale);
}

/**
 * Chance a choice picks up extra malus. Young stars on strong teams stay low;
 * past-peak players on weak, struggling rosters fail much more often.
 */
export function computeEventFailureChance(context: EventOutcomeContext): number {
  const pastPeak = getSeasonsPastPeak(context.season);
  let chance = 0.02;

  if (pastPeak > 0) {
    chance += 0.1 + 0.06 * Math.min(pastPeak, 4);
  } else if (context.season >= 4) {
    chance += 0.05;
  }

  chance += gapChance(WORLD_STRENGTH_BASELINE - context.teamStrength, 120, 0.12);
  chance += gapChance(WORLD_STRENGTH_BASELINE - mean(context.teammateRatings), 180, 0.06);

  if (context.lastSplitPoints != null && context.lastSplitPoints < 12) {
    chance += 0.06;
  }
  if (context.missedWorldsLastSeason) {
    chance += 0.05;
  }
  if (context.quitLeaning >= 2) {
    chance += 0.02;
  }

  return Math.min(MAX_FAILURE_CHANCE, chance);
}

function applyMalus(
  authored: Partial<CareerStats>,
  rng: () => number,
  pastPeak: number,
): Partial<CareerStats> {
  let ratingHit = rng() < 0.65 ? MIN_RATING_MALUS : MIN_RATING_MALUS + 1;
  if (pastPeak > 0 && rng() < 0.3) {
    ratingHit += 1;
  }
  ratingHit = Math.min(MAX_RATING_MALUS, ratingHit);

  const formHit = rng() < 0.55 ? 1 : 0;
  const moraleHit = rng() < 0.4 ? 1 : 0;

  return {
    rating: (authored.rating ?? 0) - ratingHit,
    form: (authored.form ?? 0) - formHit,
    morale: (authored.morale ?? 0) - moraleHit,
  };
}

function malusSeed(context: EventOutcomeContext): number {
  return hashString(
    `${context.careerId}:event-fail:${context.eventId}:${context.choiceId}:${context.season}`,
  );
}

export function buildEventOutcomeContext(
  state: CareerState,
  choice: CareerEventChoiceDefinition,
): EventOutcomeContext {
  const eventId = state.currentEventId;
  if (!eventId) throw new Error("No active event");

  const roster = state.world.rosters[state.currentTeamId];
  const lastSeason = state.seasonRecords[state.seasonRecords.length - 1];
  const lastSplit =
    state.currentSplits[state.currentSplits.length - 1] ?? lastSeason?.splits.at(-1);

  return {
    careerId: state.id,
    eventId,
    choiceId: choice.id,
    season: state.currentSeason,
    authoredDelta: choice.delta,
    teamStrength: roster
      ? getRosterStrength(roster, state.world, state.stats.rating)
      : WORLD_STRENGTH_BASELINE,
    teammateRatings: roster
      ? roster
          .filter((playerId) => playerId !== USER_ROSTER_ID)
          .map((playerId) => getRosterPlayerRating(playerId, state.world, state.stats.rating))
      : [],
    lastSplitPoints: lastSplit?.points ?? null,
    missedWorldsLastSeason: lastSeason ? lastSeason.worlds === null : false,
    quitLeaning: state.destinyLeanings.quit,
  };
}

export function resolveEventOutcome(
  context: EventOutcomeContext,
  rng: () => number = createRng(malusSeed(context)),
): ResolvedEventOutcome {
  const chance = computeEventFailureChance(context);
  if (rng() >= chance) {
    return { delta: { ...context.authoredDelta }, failed: false };
  }

  const pastPeak = getSeasonsPastPeak(context.season);
  return {
    delta: applyMalus(context.authoredDelta, rng, pastPeak),
    failed: true,
  };
}
