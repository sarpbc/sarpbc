import { describe, expect, it } from "vitest";
import { isPickemTournamentActive } from "./pickems";
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
