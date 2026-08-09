import type { CareerEventDefinition } from "~/types/career";

function buildSeasonEvents(season: number): CareerEventDefinition[] {
  const events: CareerEventDefinition[] = [];

  const templates: Array<{
    choices: CareerEventDefinition["choices"];
  }> = [
    {
      choices: [
        { id: "a", delta: { rating: 2, form: -1 } },
        { id: "b", delta: { morale: 3, form: 1 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { form: 3, morale: -1 } },
        { id: "b", delta: { rating: 1, morale: 2 } },
        { id: "c", delta: { form: -2, rating: 2 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { morale: 4 } },
        { id: "b", delta: { rating: 2, form: 1 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { rating: 3, morale: -2 } },
        { id: "b", delta: { form: 2, morale: 1 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { form: 4, rating: -1 } },
        { id: "b", delta: { morale: 2, rating: 1 } },
        { id: "c", delta: { form: -1, morale: 3 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { rating: 2, form: 2 } },
        { id: "b", delta: { morale: -2, form: 3 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { morale: 3, form: -1 } },
        { id: "b", delta: { rating: 1, form: 2 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { form: 3, morale: 1 } },
        { id: "b", delta: { rating: 2, morale: -1 } },
        { id: "c", delta: { morale: 2, form: 1 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { rating: 4, morale: -1 } },
        { id: "b", delta: { form: 1, morale: 2 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { morale: 5 } },
        { id: "b", delta: { rating: 2, form: -2 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { form: 2, rating: 1 } },
        { id: "b", delta: { morale: 1, form: 2 } },
        { id: "c", delta: { rating: -1, morale: 4 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { rating: 1, form: 3 } },
        { id: "b", delta: { morale: 2, rating: 1 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { form: -2, rating: 3 } },
        { id: "b", delta: { morale: 3, form: 1 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { rating: 2, morale: 2 } },
        { id: "b", delta: { form: 3, morale: -2 } },
        { id: "c", delta: { form: 1, morale: 1, rating: 1 } },
      ],
    },
    {
      choices: [
        { id: "a", delta: { morale: 4, form: -1 } },
        { id: "b", delta: { rating: 3, form: 1 } },
      ],
    },
  ];

  for (let i = 0; i < 15; i++) {
    const num = String(i + 1).padStart(2, "0");
    events.push({
      id: `s${season}-e${num}`,
      season,
      choices: templates[i]!.choices,
    });
  }

  return events;
}

export const CAREER_EVENTS: CareerEventDefinition[] = [
  ...buildSeasonEvents(1),
  ...buildSeasonEvents(2),
  ...buildSeasonEvents(3),
  ...buildSeasonEvents(4),
  ...buildSeasonEvents(5),
];

export function getEventsForSeason(season: number): CareerEventDefinition[] {
  return CAREER_EVENTS.filter((event) => event.season === season);
}

export function pickRandomEvent(
  season: number,
  usedIds: string[],
  seed: number,
): CareerEventDefinition {
  const pool = getEventsForSeason(season).filter((event) => !usedIds.includes(event.id));
  const available = pool.length > 0 ? pool : getEventsForSeason(season);
  const index = seed % available.length;
  return available[index]!;
}

export function getEventById(id: string): CareerEventDefinition | undefined {
  return CAREER_EVENTS.find((event) => event.id === id);
}
