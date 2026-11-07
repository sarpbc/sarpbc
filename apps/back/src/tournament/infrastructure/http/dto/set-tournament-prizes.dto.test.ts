import { describe, expect, it } from "vitest";
import { MAX_PRIZE_AMOUNT, MAX_PRIZE_PLAYERS } from "@sarpbc/utils";
import { SetTournamentPrizesDto } from "./set-tournament-prizes.dto";

const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";

describe("SetTournamentPrizesDto", () => {
  const parse = (
    entry: Partial<{
      placement: number;
      amount: number;
      currency: string;
      teamId: string;
      playerIds: string[];
    }>,
  ) =>
    SetTournamentPrizesDto.safeParse({
      prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID, ...entry }],
    }).success;

  it("defaults the players of an entry to none", () => {
    const body = SetTournamentPrizesDto.parse({
      prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID }],
    });

    expect(body.prizes[0]?.playerIds).toEqual([]);
  });

  it("rejects malformed prize entries", () => {
    expect(parse({})).toBe(true);
    expect(parse({ amount: 12.5 })).toBe(false);
    expect(parse({ placement: 0 })).toBe(false);
    expect(parse({ teamId: "team-a" })).toBe(false);
    expect(parse({ currency: "DOLLAR" })).toBe(false);
    expect(parse({ amount: MAX_PRIZE_AMOUNT })).toBe(true);
    expect(parse({ amount: MAX_PRIZE_AMOUNT + 1 })).toBe(false);
    expect(parse({ playerIds: Array.from({ length: MAX_PRIZE_PLAYERS }, () => TEAM_ID) })).toBe(
      true,
    );
    expect(parse({ playerIds: Array.from({ length: MAX_PRIZE_PLAYERS + 1 }, () => TEAM_ID) })).toBe(
      false,
    );
  });
});
