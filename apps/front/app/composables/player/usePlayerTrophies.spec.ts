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
      displayName: "RLCS 2026 Season",
      endAt: new Date("2026-06-15T18:00:00.000Z"),
      leagueName: "RLCS",
      serie: "2026 Season",
    });
  });

  it("builds a full event name for RLCS Major Paris playoffs", () => {
    const item = toPlayerTrophyListItem(
      makeTournament({
        id: "tournament-paris",
        name: "Playoffs",
        endAt: new Date("2026-05-24T18:00:00.000Z"),
        serie: "Paris 2026",
        league: { id: "league-1", name: "RLCS Major", createdAt: NOW, updatedAt: NOW },
      }),
    );

    expect(item.displayName).toBe("RLCS Major Paris 2026");
  });

  it("prefixes league for colon-formatted serie names", () => {
    const item = toPlayerTrophyListItem(
      makeTournament({
        id: "tournament-boston",
        name: "Playoffs",
        endAt: new Date("2026-01-18T21:20:00.000Z"),
        serie: "Boston Major: Open 2 2026",
        league: { id: "league-1", name: "RLCS EU", createdAt: NOW, updatedAt: NOW },
      }),
    );

    expect(item.displayName).toBe("RLCS EU Boston Major: Open 2 2026");
  });

  it("joins league and year-only serie", () => {
    const item = toPlayerTrophyListItem(
      makeTournament({
        id: "tournament-fifae",
        name: "Playoffs",
        endAt: new Date("2025-12-19T00:00:00.000Z"),
        serie: "2025",
        league: { id: "league-1", name: "FIFAe World Cup", createdAt: NOW, updatedAt: NOW },
      }),
    );

    expect(item.displayName).toBe("FIFAe World Cup 2025");
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
      displayName: "World Championship",
      endAt: null,
      leagueName: undefined,
      serie: null,
    });
  });
});
