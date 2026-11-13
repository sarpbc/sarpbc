import { describe, expect, it } from "vitest";
import { careerMatch, mawkzy, vatira, zen } from "../../../test/career-fixtures";
import { headToHead, seriesRecord } from "./series-record";

describe("seriesRecord", () => {
  it("counts decided series on the player's side only", () => {
    const matches = [
      careerMatch({ id: "won", sides: [[zen], [vatira]], winner: 0 }),
      careerMatch({ id: "lost", sides: [[vatira], [zen]], winner: 0 }),
      careerMatch({ id: "upcoming", sides: [[zen], [vatira]], winner: null, finished: false }),
      careerMatch({ id: "elsewhere", sides: [[vatira], [mawkzy]], winner: 0 }),
    ];

    expect(seriesRecord(matches, zen.id)).toEqual({ wins: 1, losses: 1 });
  });

  it("does not count a finished series without a winner", () => {
    const matches = [careerMatch({ id: "void", sides: [[zen], [vatira]], winner: null })];

    expect(seriesRecord(matches, zen.id)).toEqual({ wins: 0, losses: 0 });
  });
});

describe("headToHead", () => {
  it("counts the series each player won against the other", () => {
    const matches = [
      careerMatch({ id: "first", sides: [[zen], [vatira]], winner: 0 }),
      careerMatch({ id: "second", sides: [[vatira], [zen]], winner: 0 }),
      careerMatch({ id: "third", sides: [[vatira], [zen]], winner: 0 }),
    ];

    expect(headToHead(matches, zen.id, vatira.id)).toEqual({ a: 1, b: 2 });
  });

  it("ignores series where both players shared a side or one did not play", () => {
    const matches = [
      careerMatch({ id: "together", sides: [[zen, vatira], [mawkzy]], winner: 0 }),
      careerMatch({ id: "without", sides: [[zen], [mawkzy]], winner: 0 }),
      careerMatch({ id: "pending", sides: [[zen], [vatira]], winner: null, finished: false }),
    ];

    expect(headToHead(matches, zen.id, vatira.id)).toEqual({ a: 0, b: 0 });
  });
});
