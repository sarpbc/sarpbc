import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import {
  Match,
  Tournament,
  TournamentParticipant,
  assertParticipantRemovable,
  type ParticipantReferences,
} from "./competition";

describe("Match outcome", () => {
  const winner = new TournamentParticipant();
  const build = (finished: boolean, endAt: Date | null, hasWinner: boolean) =>
    Object.assign(new Match(), {
      status: finished ? "finished" : "running",
      endAt,
      winner: hasWinner ? winner : null,
    });

  it.each([
    { finished: false, endAt: null, ended: false },
    { finished: true, endAt: null, ended: true },
    { finished: false, endAt: new Date("2030-01-01"), ended: true },
    { finished: true, endAt: new Date("2030-01-01"), ended: true },
  ])("hasEnded (finished=$finished, endAt=$endAt)", ({ finished, endAt, ended }) => {
    expect(build(finished, endAt, false).hasEnded()).toBe(ended);
  });

  it.each([
    { hasWinner: false, ended: false, decided: false },
    { hasWinner: false, ended: true, decided: false },
    { hasWinner: true, ended: false, decided: false },
    { hasWinner: true, ended: true, decided: true },
  ])("isDecided (winner=$hasWinner, ended=$ended)", ({ hasWinner, ended, decided }) => {
    expect(build(ended, null, hasWinner).isDecided()).toBe(decided);
  });
});

describe("Tournament date order", () => {
  const build = (beginAt: string | null, endAt: string | null) =>
    Object.assign(new Tournament(), {
      beginAt: beginAt ? new Date(beginAt) : null,
      endAt: endAt ? new Date(endAt) : null,
    });

  it.each([
    { beginAt: null, endAt: null },
    { beginAt: "2030-01-01", endAt: null },
    { beginAt: null, endAt: "2030-01-01" },
    { beginAt: "2030-01-01", endAt: "2030-01-01" },
    { beginAt: "2030-01-01", endAt: "2030-01-02" },
  ])("accepts beginAt=$beginAt endAt=$endAt", ({ beginAt, endAt }) => {
    expect(() => build(beginAt, endAt).assertDateOrder()).not.toThrow();
  });

  it("rejects an end date before the start date", () => {
    expect(() => build("2030-01-02", "2030-01-01").assertDateOrder()).toThrow(
      new InvalidInputError("End date must be on or after the start date."),
    );
  });
});

describe("Participant removal", () => {
  const free: ParticipantReferences = {
    tournamentWinner: false,
    matchParticipant: false,
    matchWinner: false,
    results: false,
  };

  it("allows a participant without references", () => {
    expect(() => assertParticipantRemovable(free)).not.toThrow();
  });

  it.each([
    {
      reference: "tournamentWinner" as const,
      message: "Cannot remove a team that is the tournament winner. Clear the winner first.",
    },
    {
      reference: "matchParticipant" as const,
      message:
        "Cannot remove a team that already appears in matches. Remove or reassign those matches first.",
    },
    {
      reference: "matchWinner" as const,
      message:
        "Cannot remove a team that is recorded as a match winner. Clear those winners first.",
    },
    {
      reference: "results" as const,
      message: "Cannot remove a team that has match results. Remove those results first.",
    },
  ])("rejects a participant referenced by $reference", ({ reference, message }) => {
    expect(() => assertParticipantRemovable({ ...free, [reference]: true })).toThrow(
      new InvalidInputError(message),
    );
  });

  it("reports the first violated reference in check order", () => {
    expect(() =>
      assertParticipantRemovable({
        tournamentWinner: true,
        matchParticipant: true,
        matchWinner: true,
        results: true,
      }),
    ).toThrow("tournament winner");
  });
});
