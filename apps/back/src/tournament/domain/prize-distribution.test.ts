import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { assertPrizeDistribution, type PrizeEntry } from "./prize-distribution";

const entry: PrizeEntry = {
  placement: 1,
  amount: 1000,
  currency: "USD",
  teamId: "team-a",
  playerIds: ["player-a"],
};

describe("assertPrizeDistribution", () => {
  it("accepts tied placements in several currencies", () => {
    expect(() =>
      assertPrizeDistribution([
        entry,
        { ...entry, placement: 3, currency: "EUR", teamId: "team-b", playerIds: [] },
        { ...entry, placement: 3, teamId: "team-c", playerIds: ["player-c"] },
      ]),
    ).not.toThrow();
    expect(() => assertPrizeDistribution([])).not.toThrow();
  });

  it.each([
    ["a zero placement", { placement: 0 }],
    ["a fractional amount", { amount: 10.5 }],
    ["a zero amount", { amount: 0 }],
    ["an unknown currency", { currency: "XYZ" }],
    ["a lowercase currency", { currency: "usd" }],
  ])("rejects %s", (_, override) => {
    expect(() => assertPrizeDistribution([{ ...entry, ...override }])).toThrow(InvalidInputError);
  });

  it("rejects a team or player listed twice", () => {
    expect(() => assertPrizeDistribution([entry, { ...entry, placement: 2 }])).toThrow(
      "appears twice",
    );
    expect(() =>
      assertPrizeDistribution([entry, { ...entry, placement: 2, teamId: "team-b" }]),
    ).toThrow('Player "player-a" appears twice');
  });
});
