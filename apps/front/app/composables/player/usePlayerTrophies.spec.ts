import { describe, expect, it } from "vitest";
import type { Tournament } from "~/types/tournament";
import { toPlayerTrophyListItem } from "~/composables/player/usePlayerTrophies";

const NOW = new Date("2026-07-20T12:00:00.000Z");

function makeTournament(overrides: Partial<Tournament> & { id: string }): Tournament {
  return {
    name: "World Championship",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Tournament;
}

describe("toPlayerTrophyListItem", () => {
  it("maps league object fields", () => {
    const item = toPlayerTrophyListItem(
      makeTournament({
        id: "tournament-1",
        endAt: new Date("2026-06-15T18:00:00.000Z"),
        serie: "2026 Season",
        league: { id: "league-1", name: "RLCS", createdAt: NOW, updatedAt: NOW },
      }),
    );

    expect(item).toEqual({
      id: "tournament-1",
      name: "World Championship",
      endAt: new Date("2026-06-15T18:00:00.000Z"),
      leagueName: "RLCS",
      serie: "2026 Season",
    });
  });

  it("ignores bare league id strings", () => {
    const item = toPlayerTrophyListItem(
      makeTournament({
        id: "tournament-2",
        league: "league-1",
        serie: null,
        endAt: null,
      }),
    );

    expect(item).toEqual({
      id: "tournament-2",
      name: "World Championship",
      endAt: null,
      leagueName: undefined,
      serie: null,
    });
  });
});
