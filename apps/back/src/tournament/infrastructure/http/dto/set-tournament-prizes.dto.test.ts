import { describe, expect, it } from "vitest";
import { MAX_PRIZE_AMOUNT, MAX_PRIZE_PLAYERS } from "@sarpbc/utils";
import { SetTournamentPrizesDto } from "./set-tournament-prizes.dto";

const TEAM_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";

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
    prizes: [
      { placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID, sourceUrl: null, ...entry },
    ],
  }).success;

describe("set-tournament-prizes body", () => {
  it("defaults the players of an entry to none", () => {
    const body = SetTournamentPrizesDto.parse({
      prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID, sourceUrl: null }],
    });

    expect(body.prizes[0]?.playerIds).toStrictEqual([]);
  });

  it("requires every entry to state its source, so a client unaware of sources cannot clear them", () => {
    expect(
      SetTournamentPrizesDto.safeParse({
        prizes: [{ placement: 1, amount: 100, currency: "USD", teamId: TEAM_ID }],
      }).success,
    ).toBe(false);
  });

  it("accepts a well-formed prize entry", () => {
    expect(parse({})).toBe(true);
  });

  it.each([
    ["a fractional amount", { amount: 12.5 }],
    ["a zero placement", { placement: 0 }],
    ["a team id that is not a UUID", { teamId: "team-a" }],
    ["a currency that is not a three-letter code", { currency: "DOLLAR" }],
    ["an amount above the maximum", { amount: MAX_PRIZE_AMOUNT + 1 }],
    [
      "more players than the maximum",
      { playerIds: Array.from({ length: MAX_PRIZE_PLAYERS + 1 }, () => TEAM_ID) },
    ],
  ])("rejects %s", (_label, entry) => {
    expect(parse(entry)).toBe(false);
  });

  it.each([
    ["the maximum amount", { amount: MAX_PRIZE_AMOUNT }],
    [
      "the maximum number of players",
      { playerIds: Array.from({ length: MAX_PRIZE_PLAYERS }, () => TEAM_ID) },
    ],
  ])("accepts %s", (_label, entry) => {
    expect(parse(entry)).toBe(true);
  });
});
