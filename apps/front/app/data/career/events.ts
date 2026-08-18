import type { CareerEventDefinition, CareerEventPool } from "~/types/career";

/**
 * Event mechanics only — titles, descriptions and choice labels live in i18n
 * under `page.game.career.events.{id}`.
 *
 * Stat deltas: typical choices are ±1 or ±2. ±3 and ±5 are for heavy
 * training blocks (bootcamp, all-nighters, custom packs). +5 applies in full
 * under 80.
 *
 * Form is freshness. Long hours, all-nighters, and isolation cost form.
 * Rest, sleep, and match reps restore it. Morale is mood and team vibe.
 */
export const CAREER_EVENTS: CareerEventDefinition[] = [
  // Split events — one decision before each major run.
  {
    id: "split-01",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 5, form: -2 } },
      { id: "b", delta: { form: 1, morale: 1 } },
      { id: "c", delta: { rating: 2, form: -2 } },
    ],
  },
  {
    id: "split-02",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 2, form: -1, morale: -1 } },
      { id: "b", delta: { morale: 2 } },
      { id: "c", delta: { rating: 2, morale: 1 } },
    ],
  },
  {
    id: "split-03",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 5, form: -2, morale: -2 } },
      { id: "b", delta: { rating: 1, form: 2 } },
      { id: "c", delta: { form: 2, morale: 1 }, destiny: { quit: 1 } },
    ],
  },
  {
    id: "split-04",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 2, form: -2 }, destiny: { streamer: 2 } },
      { id: "b", delta: { form: 2 } },
    ],
  },
  {
    id: "split-05",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 2, form: -1 } },
      { id: "b", delta: { form: 1, morale: 1 } },
    ],
  },
  {
    id: "split-06",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 2, rating: -1 }, destiny: { coach: 2 } },
      { id: "b", delta: { rating: 2, morale: -2 }, destiny: { quit: 1 } },
    ],
  },
  {
    id: "split-07",
    pool: "split",
    choices: [
      { id: "a", delta: { form: 2, morale: -1 } },
      { id: "b", delta: { rating: 1, form: 1, morale: 1 } },
      { id: "c", delta: { morale: 2 } },
    ],
  },
  {
    id: "split-08",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 2, form: -2 } },
      { id: "b", delta: { form: -1, morale: -1 } },
    ],
  },
  {
    id: "split-09",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 2, form: -1 }, destiny: { streamer: 2 } },
      { id: "b", delta: { rating: 2, form: 1 }, destiny: { coach: 1 } },
    ],
  },
  {
    id: "split-10",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 5, form: -1, morale: -2 } },
      { id: "b", delta: { morale: 2 } },
    ],
  },
  {
    id: "split-11",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 2, form: -1 } },
      { id: "b", delta: { morale: 2, form: 1 } },
    ],
  },
  {
    id: "split-12",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 2, form: 1 }, destiny: { quit: 2 } },
      { id: "b", delta: { morale: 2 }, destiny: { streamer: 1 } },
      { id: "c", delta: { rating: 2, morale: -1 } },
    ],
  },
  {
    id: "split-13",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 2, morale: -1, form: -1 } },
      { id: "b", delta: { form: 2, morale: 1 } },
    ],
  },
  {
    id: "split-14",
    pool: "split",
    choices: [
      { id: "a", delta: { form: 2, morale: -1 } },
      { id: "b", delta: { rating: 2, form: -2, morale: -1 } },
    ],
  },
  {
    id: "split-15",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 2, form: -1 }, destiny: { streamer: 1 } },
      { id: "b", delta: { form: 2, morale: -1 } },
    ],
  },
  {
    id: "split-16",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 2, form: -2 } },
      { id: "b", delta: { form: 2, morale: 1 } },
    ],
  },
  {
    id: "split-17",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 2, form: -2 }, destiny: { streamer: 2 } },
      { id: "b", delta: { form: 2, morale: -1 } },
    ],
  },
  {
    id: "split-18",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 1, form: -2 } },
      { id: "b", delta: { form: 2 } },
      { id: "c", delta: { morale: 2, form: 1 }, destiny: { coach: 1 } },
    ],
  },
  {
    id: "split-19",
    pool: "split",
    choices: [
      {
        id: "a",
        delta: { rating: 5, form: -2, morale: -2 },
        skipRegionals: 2,
        skipMajor: true,
      },
      { id: "b", delta: { form: 2, morale: 1 } },
    ],
  },
  {
    id: "split-20",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 5, form: -2 } },
      { id: "b", delta: { form: 1, morale: 1 } },
    ],
  },
  // Worlds events — one final decision once qualified.
  {
    id: "worlds-01",
    pool: "worlds",
    choices: [
      { id: "a", delta: { rating: 2, form: -2, morale: -1 } },
      { id: "b", delta: { morale: 2, form: 1 } },
    ],
  },
  {
    id: "worlds-02",
    pool: "worlds",
    choices: [
      { id: "a", delta: { form: 2, morale: 1 } },
      { id: "b", delta: { rating: 2, form: -2, morale: 2 } },
    ],
  },
  {
    id: "worlds-03",
    pool: "worlds",
    choices: [
      { id: "a", delta: { morale: 3 } },
      { id: "b", delta: { form: 2, morale: -1 } },
    ],
  },
  {
    id: "worlds-04",
    pool: "worlds",
    choices: [
      { id: "a", delta: { rating: 3, form: -2 } },
      { id: "b", delta: { morale: 2, form: 1 } },
    ],
  },
  {
    id: "worlds-05",
    pool: "worlds",
    choices: [
      { id: "a", delta: { morale: 2, form: -1 }, destiny: { streamer: 1 } },
      { id: "b", delta: { form: 2 }, destiny: { quit: 1 } },
    ],
  },
  {
    id: "worlds-06",
    pool: "worlds",
    choices: [
      { id: "a", delta: { rating: 3, morale: 1, form: -2 } },
      { id: "b", delta: { form: 2 } },
    ],
  },
  {
    id: "late-01",
    pool: "split",
    minSeason: 5,
    choices: [
      { id: "a", delta: { morale: 2, form: 1, rating: -1 }, destiny: { quit: 2 } },
      { id: "b", delta: { morale: 2, form: -1 }, destiny: { streamer: 2 } },
      { id: "c", delta: { morale: 2 }, destiny: { coach: 2 } },
    ],
  },
  {
    id: "late-02",
    pool: "split",
    minSeason: 5,
    choices: [
      { id: "a", delta: { morale: 2, form: -2 }, destiny: { streamer: 2 } },
      { id: "b", delta: { morale: 2, rating: -1 }, destiny: { coach: 1 } },
      { id: "c", delta: { morale: 2, form: 1 }, destiny: { quit: 2 } },
    ],
  },
  {
    id: "late-03",
    pool: "split",
    minSeason: 6,
    choices: [
      { id: "a", delta: { morale: 2, rating: -1 }, destiny: { coach: 2 } },
      { id: "b", delta: { morale: 2, form: -1 }, destiny: { streamer: 1 } },
      { id: "c", delta: { form: 1, morale: 1 }, destiny: { quit: 2 } },
    ],
  },
];

export function getEventsForPool(pool: CareerEventPool): CareerEventDefinition[] {
  return CAREER_EVENTS.filter((event) => event.pool === pool);
}

export function pickRandomEvent(
  pool: CareerEventPool,
  usedIds: string[],
  seed: number,
  season = 1,
): CareerEventDefinition {
  const eligible = getEventsForPool(pool).filter((event) => (event.minSeason ?? 1) <= season);
  const unused = eligible.filter((event) => !usedIds.includes(event.id));
  const lateUnused = unused.filter((event) => (event.minSeason ?? 1) >= 5);
  const candidates = lateUnused.length > 0 ? lateUnused : unused.length > 0 ? unused : eligible;
  const available = candidates.length > 0 ? candidates : getEventsForPool(pool);
  const index = Math.abs(seed) % available.length;
  return available[index]!;
}

export function getEventById(id: string): CareerEventDefinition | undefined {
  return CAREER_EVENTS.find((event) => event.id === id);
}
