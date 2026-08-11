import { describe, expect, it } from "vitest";
import type { MatchListItem } from "~/types/matches";
import { groupMatchesByDateThenEvent } from "./groupMatchesByDateThenEvent";

function makeMatch(
  overrides: Partial<MatchListItem> & { id: string; beginAt?: Date | null },
): MatchListItem {
  return {
    id: overrides.id,
    beginAt: overrides.beginAt,
    tournament: overrides.tournament ?? {
      id: "t1",
      name: "Playoffs",
      league: { id: "l1", name: "RLCS" },
    },
    participants: overrides.participants,
  };
}

describe("groupMatchesByDateThenEvent", () => {
  it("groups by day then tournament event", () => {
    const matches = [
      makeMatch({
        id: "1",
        beginAt: new Date("2026-08-12T18:00:00"),
        tournament: { id: "a", name: "Swiss", league: { id: "l1", name: "RLCS" } },
      }),
      makeMatch({
        id: "2",
        beginAt: new Date("2026-08-11T20:00:00"),
        tournament: { id: "b", name: "Finals", league: { id: "l1", name: "RLCS" } },
      }),
      makeMatch({
        id: "3",
        beginAt: new Date("2026-08-11T16:00:00"),
        tournament: { id: "b", name: "Finals", league: { id: "l1", name: "RLCS" } },
      }),
    ];

    const groups = groupMatchesByDateThenEvent(matches, "Unknown");

    expect(groups).toHaveLength(2);
    expect(groups[0]!.events[0]!.matches.map((m) => m.id)).toEqual(["3", "2"]);
    expect(groups[1]!.events[0]!.matches.map((m) => m.id)).toEqual(["1"]);
  });

  it("puts undated matches last", () => {
    const matches = [
      makeMatch({ id: "1", beginAt: null }),
      makeMatch({ id: "2", beginAt: new Date("2026-08-11T16:00:00") }),
    ];

    const groups = groupMatchesByDateThenEvent(matches, "Unknown");

    expect(groups[0]!.dateKey).not.toBe("__unknown__");
    expect(groups[1]!.dateKey).toBe("__unknown__");
    expect(groups[1]!.events[0]!.matches.map((m) => m.id)).toEqual(["1"]);
  });
});
