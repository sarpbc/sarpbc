import { describe, expect, it } from "vitest";
import type { PrizeEntry } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { assertPrizeDistribution } from "./prize-distribution";

const entry: PrizeEntry = {
  amount: 1000,
  currency: "USD",
  placement: 1,
  playerIds: ["player-a"],
  sourceUrl: null,
  teamId: "team-a",
};

describe(assertPrizeDistribution, () => {
  it("accepts tied placements in several currencies", () => {
    expect(() => {
      assertPrizeDistribution([
        entry,
        { ...entry, currency: "EUR", placement: 3, playerIds: [], teamId: "team-b" },
        { ...entry, placement: 3, playerIds: ["player-c"], teamId: "team-c" },
      ]);
    }).not.toThrow();
    expect(() => {
      assertPrizeDistribution([]);
    }).not.toThrow();
  });

  it.each([
    ["a zero placement", { placement: 0 }],
    ["a fractional amount", { amount: 10.5 }],
    ["a zero amount", { amount: 0 }],
    ["an unknown currency", { currency: "XYZ" }],
    ["a lowercase currency", { currency: "usd" }],
  ])("rejects %s", (_, override) => {
    expect(() => {
      assertPrizeDistribution([{ ...entry, ...override }]);
    }).toThrow(InvalidInputError);
  });

  it("rejects a team or player listed twice", () => {
    expect(() => {
      assertPrizeDistribution([entry, { ...entry, placement: 2 }]);
    }).toThrow("appears twice");
    expect(() => {
      assertPrizeDistribution([entry, { ...entry, placement: 2, teamId: "team-b" }]);
    }).toThrow('Player "player-a" appears twice');
  });
});
