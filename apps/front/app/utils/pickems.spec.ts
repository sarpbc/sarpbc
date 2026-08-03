import { describe, expect, it } from "vitest";
import {
  getPickOutcome,
  getUnpickedOpenMatches,
  isMatchLockedForPickem,
  isPickemTournamentActive,
  type PickemPickState,
} from "./pickems";
import type { Match } from "~/types/matches";
import type { Tournament } from "~/types/tournament";

function tournament(partial: Partial<Tournament>): Tournament {
  return {
    id: "t1",
    name: "Spring Major",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...partial,
  };
}

function match(partial: Partial<Match> & { id: string }): Match {
  return {
    name: "Match",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    tournament: tournament({ pickemsEnabled: true }),
    participants: [
      { id: "p1", team: { id: "team-a", name: "A" } },
      { id: "p2", team: { id: "team-b", name: "B" } },
    ] as Match["participants"],
    ...partial,
  };
}

describe("isPickemTournamentActive", () => {
  const now = Date.parse("2026-07-17T12:00:00.000Z");

  it("returns false when pickems are disabled", () => {
    expect(
      isPickemTournamentActive(tournament({ pickemsEnabled: false, endAt: undefined }), now),
    ).toBe(false);
  });

  it("returns true for an open pickem tournament", () => {
    expect(
      isPickemTournamentActive(
        tournament({
          pickemsEnabled: true,
          endAt: new Date("2026-08-01T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(true);
  });

  it("returns false when endAt is in the past", () => {
    expect(
      isPickemTournamentActive(
        tournament({
          pickemsEnabled: true,
          endAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("returns false when a winner is set via winnerId", () => {
    expect(
      isPickemTournamentActive(
        tournament({
          pickemsEnabled: true,
          winnerId: "participant-1",
        }),
        now,
      ),
    ).toBe(false);
  });

  it("returns false when a winner relation or FK is present", () => {
    expect(
      isPickemTournamentActive(
        tournament({
          pickemsEnabled: true,
          winner: { id: "participant-1" },
        }),
        now,
      ),
    ).toBe(false);
    expect(
      isPickemTournamentActive(
        tournament({
          pickemsEnabled: true,
          winner: "participant-1",
        }),
        now,
      ),
    ).toBe(false);
  });
});

describe("isMatchLockedForPickem", () => {
  const now = Date.parse("2026-07-17T12:00:00.000Z");

  it("locks when beginAt has passed", () => {
    expect(
      isMatchLockedForPickem(
        match({ id: "m1", beginAt: new Date("2026-07-17T11:00:00.000Z") }),
        now,
      ),
    ).toBe(true);
  });

  it("stays open before beginAt", () => {
    expect(
      isMatchLockedForPickem(
        match({ id: "m1", beginAt: new Date("2026-07-17T13:00:00.000Z") }),
        now,
      ),
    ).toBe(false);
  });
});

describe("getUnpickedOpenMatches", () => {
  const now = Date.parse("2026-07-17T12:00:00.000Z");

  it("returns only open matches without picks, sorted by beginAt", () => {
    const matches = [
      match({ id: "later", beginAt: new Date("2026-07-17T16:00:00.000Z") }),
      match({ id: "soon", beginAt: new Date("2026-07-17T14:00:00.000Z") }),
      match({ id: "started", beginAt: new Date("2026-07-17T10:00:00.000Z") }),
      match({ id: "picked", beginAt: new Date("2026-07-17T15:00:00.000Z") }),
    ];
    const picks = new Map<string, PickemPickState>([
      ["picked", { pickedParticipant: "p1", points: null, scored: false }],
    ]);

    expect(getUnpickedOpenMatches(matches, picks, now).map((m) => m.id)).toEqual(["soon", "later"]);
  });
});

describe("getPickOutcome", () => {
  it("returns correct when scored with points", () => {
    expect(
      getPickOutcome(match({ id: "m1" }), {
        pickedParticipant: "p1",
        points: 5,
        scored: true,
      }),
    ).toBe("correct");
  });

  it("returns incorrect when scored with zero points", () => {
    expect(
      getPickOutcome(match({ id: "m1" }), {
        pickedParticipant: "p1",
        points: 0,
        scored: true,
      }),
    ).toBe("incorrect");
  });

  it("returns pending when not scored", () => {
    expect(
      getPickOutcome(match({ id: "m1" }), {
        pickedParticipant: "p1",
        points: null,
        scored: false,
      }),
    ).toBe("pending");
  });

  it("returns none without a pick", () => {
    expect(getPickOutcome(match({ id: "m1" }), undefined)).toBe("none");
  });
});
