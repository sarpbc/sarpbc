import type { CareerEventDefinition, CareerEventPool } from "~/types/career";

/**
 * Event mechanics only — titles, descriptions and choice labels live in i18n
 * under `page.game.career.events.{id}`.
 */
export const CAREER_EVENTS: CareerEventDefinition[] = [
  // Split events — one decision before each major run.
  {
    id: "split-01",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 5, form: -3 } },
      { id: "b", delta: { form: 2 } },
      { id: "c", delta: { rating: 2, morale: -2 } },
    ],
  },
  {
    id: "split-02",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 4, morale: -2 } },
      { id: "b", delta: { morale: 3, form: -1 } },
      { id: "c", delta: { rating: 2, morale: 1 } },
    ],
  },
  {
    id: "split-03",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 4, morale: -2 } },
      { id: "b", delta: { form: 4, rating: -1 } },
      { id: "c", delta: { morale: 5, form: -2 } },
    ],
  },
  {
    id: "split-04",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 4, form: -3 } },
      { id: "b", delta: { form: 2 } },
    ],
  },
  {
    id: "split-05",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 4, form: -3 } },
      { id: "b", delta: { form: 3 } },
    ],
  },
  {
    id: "split-06",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 4, form: 1, rating: -1 } },
      { id: "b", delta: { rating: 3, morale: -3 } },
    ],
  },
  {
    id: "split-07",
    pool: "split",
    choices: [
      { id: "a", delta: { form: 4, morale: -2 } },
      { id: "b", delta: { rating: 1, form: 1, morale: 1 } },
      { id: "c", delta: { morale: 2, form: -2 } },
    ],
  },
  {
    id: "split-08",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 2, form: -3 } },
      { id: "b", delta: { form: 1, morale: -1 } },
    ],
  },
  {
    id: "split-09",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 4, form: -2 } },
      { id: "b", delta: { rating: 2, form: 1 } },
    ],
  },
  {
    id: "split-10",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 3, form: 2, morale: -3 } },
      { id: "b", delta: { morale: 2 } },
    ],
  },
  {
    id: "split-11",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 3, form: -1 } },
      { id: "b", delta: { morale: 2, form: 1 } },
    ],
  },
  {
    id: "split-12",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 3, form: 1 } },
      { id: "b", delta: { morale: 2, form: -2 } },
      { id: "c", delta: { rating: 2, morale: -1 } },
    ],
  },
  {
    id: "split-13",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 3, morale: -1, form: -1 } },
      { id: "b", delta: { form: 2, morale: 1 } },
    ],
  },
  {
    id: "split-14",
    pool: "split",
    choices: [
      { id: "a", delta: { form: 4, morale: -1 } },
      { id: "b", delta: { rating: 3, form: -2, morale: -2 } },
    ],
  },
  {
    id: "split-15",
    pool: "split",
    choices: [
      { id: "a", delta: { morale: 4, form: -1 } },
      { id: "b", delta: { form: 3, morale: -2 } },
    ],
  },
  {
    id: "split-16",
    pool: "split",
    choices: [
      { id: "a", delta: { rating: 4, form: -2 } },
      { id: "b", delta: { form: 2, morale: 1 } },
    ],
  },
  // Worlds events — one final decision once qualified.
  {
    id: "worlds-01",
    pool: "worlds",
    choices: [
      { id: "a", delta: { rating: 2, form: 2, morale: -2 } },
      { id: "b", delta: { morale: 3, form: 1 } },
    ],
  },
  {
    id: "worlds-02",
    pool: "worlds",
    choices: [
      { id: "a", delta: { form: 4, morale: -1 } },
      { id: "b", delta: { rating: 2, form: -2, morale: 2 } },
    ],
  },
  {
    id: "worlds-03",
    pool: "worlds",
    choices: [
      { id: "a", delta: { morale: 4 } },
      { id: "b", delta: { form: 3, morale: -1 } },
    ],
  },
  {
    id: "worlds-04",
    pool: "worlds",
    choices: [
      { id: "a", delta: { rating: 3, form: -2 } },
      { id: "b", delta: { morale: 3, form: 1, rating: -1 } },
    ],
  },
  {
    id: "worlds-05",
    pool: "worlds",
    choices: [
      { id: "a", delta: { morale: 3, form: -2 } },
      { id: "b", delta: { form: 2 } },
    ],
  },
  {
    id: "worlds-06",
    pool: "worlds",
    choices: [
      { id: "a", delta: { rating: 3, morale: 1, form: -2 } },
      { id: "b", delta: { form: 3 } },
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
): CareerEventDefinition {
  const candidates = getEventsForPool(pool).filter((event) => !usedIds.includes(event.id));
  const available = candidates.length > 0 ? candidates : getEventsForPool(pool);
  const index = Math.abs(seed) % available.length;
  return available[index]!;
}

export function getEventById(id: string): CareerEventDefinition | undefined {
  return CAREER_EVENTS.find((event) => event.id === id);
}
