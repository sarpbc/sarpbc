import { describe, expect, it } from "vitest";
import type { Tournament } from "~/types/tournament";
import { splitTeamTournaments } from "~/composables/team/useTeamTournaments";

const NOW = new Date("2026-07-20T12:00:00.000Z").getTime();
const TEAM_ID = "team-kc";

function makeTournament(overrides: Partial<Tournament> & { id: string }): Tournament {
  return {
    name: `Tournament ${overrides.id}`,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    league: { id: "league-1", name: "RLCS", createdAt: new Date(NOW), updatedAt: new Date(NOW) },
    ...overrides,
  } as Tournament;
}

describe("splitTeamTournaments", () => {
  it("splits live, upcoming and past tournaments", () => {
    const sections = splitTeamTournaments(
      [
        makeTournament({
          id: "finished",
          beginAt: new Date("2026-06-01T00:00:00.000Z"),
          endAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
        makeTournament({
          id: "live",
          beginAt: new Date("2026-07-19T00:00:00.000Z"),
          endAt: new Date("2026-07-25T00:00:00.000Z"),
        }),
        makeTournament({
          id: "upcoming",
          beginAt: new Date("2026-08-01T00:00:00.000Z"),
          endAt: new Date("2026-08-10T00:00:00.000Z"),
        }),
      ],
      TEAM_ID,
      NOW,
    );

    expect(sections.past.map((event) => event.id)).toEqual(["finished"]);
    expect(sections.live.map((event) => event.id)).toEqual(["live"]);
    expect(sections.upcoming.map((event) => event.id)).toEqual(["upcoming"]);
  });

  it("skips tournaments without beginAt", () => {
    const sections = splitTeamTournaments(
      [
        makeTournament({ id: "no-dates" }),
        makeTournament({
          id: "dated",
          beginAt: new Date("2026-08-01T00:00:00.000Z"),
        }),
      ],
      TEAM_ID,
      NOW,
    );

    expect(sections.upcoming.map((event) => event.id)).toEqual(["dated"]);
    expect(sections.live).toHaveLength(0);
    expect(sections.past).toHaveLength(0);
  });

  it("orders upcoming and live ascending and past descending", () => {
    const sections = splitTeamTournaments(
      [
        makeTournament({
          id: "later-upcoming",
          beginAt: new Date("2026-08-10T00:00:00.000Z"),
        }),
        makeTournament({
          id: "sooner-upcoming",
          beginAt: new Date("2026-08-01T00:00:00.000Z"),
        }),
        makeTournament({
          id: "older-past",
          beginAt: new Date("2026-05-01T00:00:00.000Z"),
          endAt: new Date("2026-06-01T00:00:00.000Z"),
        }),
        makeTournament({
          id: "newer-past",
          beginAt: new Date("2026-06-01T00:00:00.000Z"),
          endAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
      ],
      TEAM_ID,
      NOW,
    );

    expect(sections.upcoming.map((event) => event.id)).toEqual([
      "sooner-upcoming",
      "later-upcoming",
    ]);
    expect(sections.past.map((event) => event.id)).toEqual(["newer-past", "older-past"]);
  });

  it("caps past tournaments at 10", () => {
    const tournaments = Array.from({ length: 14 }, (_, index) =>
      makeTournament({
        id: `past-${index}`,
        beginAt: new Date(NOW - (index + 30) * 86_400_000),
        endAt: new Date(NOW - (index + 1) * 86_400_000),
      }),
    );

    const sections = splitTeamTournaments(tournaments, TEAM_ID, NOW);

    expect(sections.past).toHaveLength(10);
    expect(sections.past[0]?.id).toBe("past-0");
  });

  it("marks isWinner when the team won the tournament", () => {
    const sections = splitTeamTournaments(
      [
        makeTournament({
          id: "won",
          beginAt: new Date("2026-06-01T00:00:00.000Z"),
          endAt: new Date("2026-07-01T00:00:00.000Z"),
          winner: {
            id: "participant-1",
            team: { id: TEAM_ID, name: "Karmine Corp" },
          } as Tournament["winner"],
        }),
        makeTournament({
          id: "lost",
          beginAt: new Date("2026-05-01T00:00:00.000Z"),
          endAt: new Date("2026-06-01T00:00:00.000Z"),
          winner: {
            id: "participant-2",
            team: { id: "team-other", name: "Team BDS" },
          } as Tournament["winner"],
        }),
      ],
      TEAM_ID,
      NOW,
    );

    const won = sections.past.find((event) => event.id === "won");
    const lost = sections.past.find((event) => event.id === "lost");

    expect(won?.isWinner).toBe(true);
    expect(lost?.isWinner).toBe(false);
  });

  it("maps league, serie and status on list items", () => {
    const sections = splitTeamTournaments(
      [
        makeTournament({
          id: "mapped",
          name: "World Championship",
          serie: "2026 Season",
          beginAt: new Date("2026-08-01T00:00:00.000Z"),
        }),
      ],
      TEAM_ID,
      NOW,
    );

    expect(sections.upcoming[0]).toEqual({
      id: "mapped",
      name: "World Championship",
      beginAt: new Date("2026-08-01T00:00:00.000Z"),
      endAt: null,
      leagueName: "RLCS",
      serie: "2026 Season",
      status: "upcoming",
      isWinner: false,
    });
  });
});
