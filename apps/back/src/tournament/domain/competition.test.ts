import { describe, expect, it } from "vitest";
import { Match, TournamentParticipant } from "./competition";

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
