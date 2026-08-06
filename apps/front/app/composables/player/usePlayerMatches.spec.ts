import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import { splitPlayerMatches } from "~/composables/player/usePlayerMatches";

const NOW = new Date("2026-07-20T12:00:00.000Z").getTime();

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    name: `Match ${overrides.id}`,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    tournament: {
      id: "tournament-1",
      name: "Playoffs",
      serie: "2026 Season",
      league: { id: "league-1", name: "RLCS" },
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
    },
    ...overrides,
  } as Match;
}

describe("splitPlayerMatches", () => {
  it("splits past, live and upcoming matches", () => {
    const sections = splitPlayerMatches(
      [
        makeMatch({ id: "finished-by-end-at", endAt: new Date("2026-07-19T18:00:00.000Z") }),
        makeMatch({ id: "finished-by-status", status: "finished" }),
        makeMatch({ id: "running", beginAt: new Date(NOW - 1000), status: "running" }),
        makeMatch({ id: "started-without-status", beginAt: new Date(NOW - 60_000) }),
        makeMatch({ id: "scheduled", beginAt: new Date("2026-07-21T18:00:00.000Z") }),
      ],
      NOW,
    );

    expect(sections.past.map((match) => match.id)).toEqual([
      "finished-by-end-at",
      "finished-by-status",
    ]);
    expect(sections.live.map((match) => match.id)).toEqual(["started-without-status", "running"]);
    expect(sections.upcoming.map((match) => match.id)).toEqual(["scheduled"]);
  });

  it("orders upcoming ascending and past descending", () => {
    const sections = splitPlayerMatches(
      [
        makeMatch({ id: "later", beginAt: new Date("2026-07-25T18:00:00.000Z") }),
        makeMatch({ id: "sooner", beginAt: new Date("2026-07-21T18:00:00.000Z") }),
        makeMatch({ id: "older-result", endAt: new Date("2026-07-01T18:00:00.000Z") }),
        makeMatch({ id: "newer-result", endAt: new Date("2026-07-18T18:00:00.000Z") }),
      ],
      NOW,
    );

    expect(sections.upcoming.map((match) => match.id)).toEqual(["sooner", "later"]);
    expect(sections.past.map((match) => match.id)).toEqual(["newer-result", "older-result"]);
  });

  it("caps past matches at 10", () => {
    const matches = Array.from({ length: 14 }, (_, index) =>
      makeMatch({
        id: `result-${index}`,
        endAt: new Date(NOW - (index + 1) * 86_400_000),
      }),
    );

    const sections = splitPlayerMatches(matches, NOW);

    expect(sections.past).toHaveLength(10);
    expect(sections.past[0]?.id).toBe("result-0");
  });

  it("maps participants, results and tournament for match list components", () => {
    const sections = splitPlayerMatches(
      [
        makeMatch({
          id: "mapped",
          endAt: new Date("2026-07-18T18:00:00.000Z"),
          participants: [
            { id: "participant-a", team: { id: "team-a", name: "Karmine Corp" } },
            { id: "participant-b", team: { id: "team-b", name: "Team BDS" } },
          ] as Match["participants"],
          results: [
            { participant: { id: "participant-a" }, score: 4 },
            { participant: { id: "participant-b" }, score: 2 },
          ],
        }),
      ],
      NOW,
    );

    expect(sections.past[0]).toEqual({
      id: "mapped",
      beginAt: null,
      participants: [
        { id: "participant-a", team: { name: "Karmine Corp" } },
        { id: "participant-b", team: { name: "Team BDS" } },
      ],
      results: [
        { participant: { id: "participant-a" }, score: 4 },
        { participant: { id: "participant-b" }, score: 2 },
      ],
      tournament: {
        id: "tournament-1",
        name: "Playoffs",
        serie: "2026 Season",
        league: { id: "league-1", name: "RLCS" },
      },
    });
  });
});
