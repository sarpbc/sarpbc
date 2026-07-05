import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import { groupTournamentMatchesByDate } from "./groupMatchesByDate";

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    id: overrides.id,
    name: overrides.name ?? "Match",
    createdAt: new Date(),
    updatedAt: new Date(),
    tournament: overrides.tournament ?? ({ id: "t1", name: "Tournament" } as Match["tournament"]),
    beginAt: overrides.beginAt,
    endAt: overrides.endAt,
    participants: overrides.participants,
    results: overrides.results,
    winner: overrides.winner,
    status: overrides.status,
    slug: overrides.slug,
    pandascoreId: overrides.pandascoreId,
    numberOfGames: overrides.numberOfGames,
    previousMatches: overrides.previousMatches,
  };
}

describe("groupTournamentMatchesByDate", () => {
  it("groups completed matches by end date with most recent days first", () => {
    const matches = [
      makeMatch({ id: "1", endAt: new Date("2025-06-01T18:00:00Z") }),
      makeMatch({ id: "2", endAt: new Date("2025-06-10T20:00:00Z") }),
      makeMatch({ id: "3", endAt: new Date("2025-06-10T14:00:00Z") }),
      makeMatch({ id: "4", endAt: new Date("2025-05-28T12:00:00Z") }),
    ];

    const { completed } = groupTournamentMatchesByDate(matches);

    expect(completed).toHaveLength(3);
    expect(completed[0]!.matches.map((m) => m.id)).toEqual(["2", "3"]);
    expect(completed[1]!.matches.map((m) => m.id)).toEqual(["1"]);
    expect(completed[2]!.matches.map((m) => m.id)).toEqual(["4"]);
  });

  it("groups upcoming matches by begin date with soonest days first", () => {
    const matches = [
      makeMatch({ id: "1", beginAt: new Date("2025-07-10T18:00:00Z") }),
      makeMatch({ id: "2", beginAt: new Date("2025-07-05T14:00:00Z") }),
      makeMatch({ id: "3", beginAt: new Date("2025-07-05T20:00:00Z") }),
    ];

    const { upcoming } = groupTournamentMatchesByDate(matches);

    expect(upcoming).toHaveLength(2);
    expect(upcoming[0]!.matches.map((m) => m.id)).toEqual(["2", "3"]);
    expect(upcoming[1]!.matches.map((m) => m.id)).toEqual(["1"]);
  });

  it("separates upcoming and completed matches", () => {
    const matches = [
      makeMatch({ id: "past", endAt: new Date("2025-06-01T18:00:00Z") }),
      makeMatch({ id: "future", beginAt: new Date("2025-07-10T18:00:00Z") }),
    ];

    const grouped = groupTournamentMatchesByDate(matches);

    expect(grouped.completed).toHaveLength(1);
    expect(grouped.completed[0]!.matches.map((m) => m.id)).toEqual(["past"]);
    expect(grouped.upcoming).toHaveLength(1);
    expect(grouped.upcoming[0]!.matches.map((m) => m.id)).toEqual(["future"]);
  });
});
