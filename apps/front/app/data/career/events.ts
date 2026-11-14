import type { CareerEventDefinition, CareerEventPool } from "~/types/career";

export const CAREER_EVENTS: CareerEventDefinition[] = [
  {
    choices: [
      { delta: { form: -2, rating: 5 }, id: "a" },
      { delta: { form: 1, morale: 1 }, id: "b" },
      { delta: { form: -2, rating: 2 }, id: "c" },
    ],
    id: "split-01",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -1, morale: -1, rating: 2 }, id: "a" },
      { delta: { morale: 2 }, id: "b" },
      { delta: { morale: 1, rating: 2 }, id: "c" },
    ],
    id: "split-02",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, morale: -2, rating: 5 }, id: "a" },
      { delta: { form: 2, rating: 1 }, id: "b" },
      { delta: { form: 2, morale: 1 }, destiny: { quit: 1 }, id: "c" },
    ],
    id: "split-03",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, morale: 2 }, destiny: { streamer: 2 }, id: "a" },
      { delta: { form: 2 }, id: "b" },
    ],
    id: "split-04",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -1, rating: 2 }, id: "a" },
      { delta: { form: 1, morale: 1 }, id: "b" },
    ],
    id: "split-05",
    pool: "split",
  },
  {
    choices: [
      { delta: { morale: 2, rating: -1 }, destiny: { coach: 2 }, id: "a" },
      { delta: { morale: -2, rating: 2 }, destiny: { quit: 1 }, id: "b" },
    ],
    id: "split-06",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: 2, morale: -1 }, id: "a" },
      { delta: { form: 1, morale: 1, rating: 1 }, id: "b" },
      { delta: { morale: 2 }, id: "c" },
    ],
    id: "split-07",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, rating: 2 }, id: "a" },
      { delta: { form: -1, morale: -1 }, id: "b" },
    ],
    id: "split-08",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -1, morale: 2 }, destiny: { streamer: 2 }, id: "a" },
      { delta: { form: 1, rating: 2 }, destiny: { coach: 1 }, id: "b" },
    ],
    id: "split-09",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -1, morale: -2, rating: 5 }, id: "a" },
      { delta: { morale: 2 }, id: "b" },
    ],
    id: "split-10",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -1, rating: 2 }, id: "a" },
      { delta: { form: 1, morale: 2 }, id: "b" },
    ],
    id: "split-11",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: 1, morale: 2 }, destiny: { quit: 2 }, id: "a" },
      { delta: { morale: 2 }, destiny: { streamer: 1 }, id: "b" },
      { delta: { morale: -1, rating: 2 }, id: "c" },
    ],
    id: "split-12",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -1, morale: -1, rating: 2 }, id: "a" },
      { delta: { form: 2, morale: 1 }, id: "b" },
    ],
    id: "split-13",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: 2, morale: -1 }, id: "a" },
      { delta: { form: -2, morale: -1, rating: 2 }, id: "b" },
    ],
    id: "split-14",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -1, morale: 2 }, destiny: { streamer: 1 }, id: "a" },
      { delta: { form: 2, morale: -1 }, id: "b" },
    ],
    id: "split-15",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, rating: 2 }, id: "a" },
      { delta: { form: 2, morale: 1 }, id: "b" },
    ],
    id: "split-16",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, morale: 2 }, destiny: { streamer: 2 }, id: "a" },
      { delta: { form: 2, morale: -1 }, id: "b" },
    ],
    id: "split-17",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, morale: 1 }, id: "a" },
      { delta: { form: 2 }, id: "b" },
      { delta: { form: 1, morale: 2 }, destiny: { coach: 1 }, id: "c" },
    ],
    id: "split-18",
    pool: "split",
  },
  {
    choices: [
      {
        delta: { form: -2, morale: -2, rating: 5 },
        id: "a",
        skipMajor: true,
        skipRegionals: 2,
      },
      { delta: { form: 2, morale: 1 }, id: "b" },
    ],
    id: "split-19",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, rating: 5 }, id: "a" },
      { delta: { form: 1, morale: 1 }, id: "b" },
    ],
    id: "split-20",
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, morale: -1, rating: 2 }, id: "a" },
      { delta: { form: 1, morale: 2 }, id: "b" },
    ],
    id: "worlds-01",
    pool: "worlds",
  },
  {
    choices: [
      { delta: { form: 2, morale: 1 }, id: "a" },
      { delta: { form: -2, morale: 2, rating: 2 }, id: "b" },
    ],
    id: "worlds-02",
    pool: "worlds",
  },
  {
    choices: [
      { delta: { morale: 3 }, id: "a" },
      { delta: { form: 2, morale: -1 }, id: "b" },
    ],
    id: "worlds-03",
    pool: "worlds",
  },
  {
    choices: [
      { delta: { form: -2, rating: 3 }, id: "a" },
      { delta: { form: 1, morale: 2 }, id: "b" },
    ],
    id: "worlds-04",
    pool: "worlds",
  },
  {
    choices: [
      { delta: { form: -1, morale: 2 }, destiny: { streamer: 1 }, id: "a" },
      { delta: { form: 2 }, destiny: { quit: 1 }, id: "b" },
    ],
    id: "worlds-05",
    pool: "worlds",
  },
  {
    choices: [
      { delta: { form: -2, morale: 1, rating: 3 }, id: "a" },
      { delta: { form: 2 }, id: "b" },
    ],
    id: "worlds-06",
    pool: "worlds",
  },
  {
    choices: [
      { delta: { form: 1, morale: 2, rating: -1 }, destiny: { quit: 2 }, id: "a" },
      { delta: { form: -1, morale: 2 }, destiny: { streamer: 2 }, id: "b" },
      { delta: { morale: 2 }, destiny: { coach: 2 }, id: "c" },
    ],
    id: "late-01",
    minSeason: 5,
    pool: "split",
  },
  {
    choices: [
      { delta: { form: -2, morale: 2 }, destiny: { streamer: 2 }, id: "a" },
      { delta: { morale: 2, rating: -1 }, destiny: { coach: 1 }, id: "b" },
      { delta: { form: 1, morale: 2 }, destiny: { quit: 2 }, id: "c" },
    ],
    id: "late-02",
    minSeason: 5,
    pool: "split",
  },
  {
    choices: [
      { delta: { morale: 2, rating: -1 }, destiny: { coach: 2 }, id: "a" },
      { delta: { form: -1, morale: 2 }, destiny: { streamer: 1 }, id: "b" },
      { delta: { form: 1, morale: 1 }, destiny: { quit: 2 }, id: "c" },
    ],
    id: "late-03",
    minSeason: 6,
    pool: "split",
  },
];

export const getEventsForPool = (pool: CareerEventPool): CareerEventDefinition[] =>
  CAREER_EVENTS.filter((event) => event.pool === pool);

const firstNonEmpty = (...lists: CareerEventDefinition[][]): CareerEventDefinition[] =>
  lists.find((list) => list.length > 0) ?? [];

export const pickRandomEvent = (
  pool: CareerEventPool,
  usedIds: string[],
  seed: number,
  season = 1,
): CareerEventDefinition => {
  const eligible = getEventsForPool(pool).filter((event) => (event.minSeason ?? 1) <= season);
  const unused = eligible.filter((event) => !usedIds.includes(event.id));
  const lateUnused = unused.filter((event) => (event.minSeason ?? 1) >= 5);
  const candidates = firstNonEmpty(lateUnused, unused, eligible, getEventsForPool(pool));
  const picked = candidates[Math.abs(seed) % candidates.length];

  if (!picked) {
    throw new Error(`No career event available for pool ${pool}`);
  }

  return picked;
};

export const getEventById = (id: string): CareerEventDefinition | undefined =>
  CAREER_EVENTS.find((event) => event.id === id);
