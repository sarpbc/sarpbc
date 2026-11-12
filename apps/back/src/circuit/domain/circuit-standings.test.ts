import type { CircuitScaleTier, TournamentEventRef } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { computeCircuitStandings, type CircuitStageResult } from "./circuit-standings";

const now = new Date("2026-06-01T00:00:00Z");
const past = (day: number) => new Date(`2026-0${day}-01T00:00:00Z`);
const future = new Date("2026-09-01T00:00:00Z");

const scale: CircuitScaleTier[] = [
  { from: 1, to: 1, points: 10 },
  { from: 2, to: 2, points: 6 },
  { from: 3, to: 4, points: 3 },
];

const event = (id: string): TournamentEventRef => ({ id, slug: id, name: `Event ${id}` });
const team = (id: string) => ({
  id,
  name: id.toUpperCase(),
  slug: id,
  imageUrl: null,
  darkModeImageUrl: null,
});

function stage(overrides: Partial<CircuitStageResult> & { event: TournamentEventRef }) {
  return {
    beginAt: past(1),
    endAt: past(2),
    scale,
    sourceUrl: "https://example.org/rules",
    placements: [],
    ...overrides,
  };
}

describe("computeCircuitStandings", () => {
  it("adds the points of each placement and breaks the total down by event", () => {
    const { rows, events } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          placements: [
            { team: team("kc"), placement: 1 },
            { team: team("bds"), placement: 2 },
          ],
        }),
        stage({
          event: event("b"),
          beginAt: past(3),
          endAt: past(4),
          placements: [
            { team: team("bds"), placement: 1 },
            { team: team("kc"), placement: 3 },
          ],
        }),
      ],
      now,
    );

    expect(events.map(({ event: { id }, status }) => [id, status])).toEqual([
      ["a", "counted"],
      ["b", "counted"],
    ]);
    expect(rows).toEqual([
      {
        rank: 1,
        points: 16,
        team: team("bds"),
        events: [
          { eventId: "a", points: 6, placement: 2 },
          { eventId: "b", points: 10, placement: 1 },
        ],
      },
      {
        rank: 2,
        points: 13,
        team: team("kc"),
        events: [
          { eventId: "a", points: 10, placement: 1 },
          { eventId: "b", points: 3, placement: 3 },
        ],
      },
    ]);
  });

  it("gives tied placements the same tier and tied totals the same rank", () => {
    const { rows } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          placements: [
            { team: team("vit"), placement: 1 },
            { team: team("kc"), placement: 3 },
            { team: team("bds"), placement: 3 },
            { team: team("g2"), placement: 5 },
          ],
        }),
      ],
      now,
    );

    expect(rows.map(({ rank, team: { id }, points }) => [rank, id, points])).toEqual([
      [1, "vit", 10],
      [2, "bds", 3],
      [2, "kc", 3],
    ]);
  });

  it("awards nothing for a stage whose scale is missing", () => {
    const { rows, events } = computeCircuitStandings(
      [stage({ event: event("a"), scale: [], placements: [{ team: team("kc"), placement: 1 }] })],
      now,
    );

    expect(rows).toEqual([]);
    expect(events[0]?.status).toBe("scale_missing");
  });

  it("keeps an ended event without results in the list without awarding points", () => {
    const { rows, events } = computeCircuitStandings([stage({ event: event("a") })], now);

    expect(rows).toEqual([]);
    expect(events).toEqual([
      {
        event: event("a"),
        beginAt: past(1).toISOString(),
        endAt: past(2).toISOString(),
        status: "awaiting_results",
      },
    ]);
  });

  it("counts only stages that have ended", () => {
    const placements = [{ team: team("kc"), placement: 1 }];
    const { rows, events } = computeCircuitStandings(
      [
        stage({ event: event("live"), endAt: future, placements }),
        stage({ event: event("next"), beginAt: future, endAt: null, placements }),
      ],
      now,
    );

    expect(rows).toEqual([]);
    expect(events.map(({ event: { id }, status }) => [id, status])).toEqual([
      ["live", "in_progress"],
      ["next", "upcoming"],
    ]);
  });

  it("sums the stages of one event and lists each scale source once", () => {
    const { rows, sourceUrls } = computeCircuitStandings(
      [
        stage({
          event: event("a"),
          scale: [{ from: 9, to: 16, points: 1 }],
          placements: [{ team: team("kc"), placement: 9 }],
        }),
        stage({ event: event("a"), placements: [{ team: team("kc"), placement: 2 }] }),
      ],
      now,
    );

    expect(rows[0]?.events).toEqual([{ eventId: "a", points: 7, placement: 2 }]);
    expect(sourceUrls).toEqual(["https://example.org/rules"]);
  });
});
