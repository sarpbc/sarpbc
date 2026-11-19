import { describe, expect, it } from "vitest";
import { careerMatch, mawkzy, vatira, zen } from "../../../test/career.fixture";
import { headToHead, seriesRecord } from "./series-record";

describe(seriesRecord, () => {
  it("counts decided series on the player's side only", () => {
    const matches = [
      careerMatch({ id: "won", sides: [[zen], [vatira]], winner: 0 }),
      careerMatch({ id: "lost", sides: [[vatira], [zen]], winner: 0 }),
      careerMatch({ finished: false, id: "upcoming", sides: [[zen], [vatira]], winner: null }),
      careerMatch({ id: "elsewhere", sides: [[vatira], [mawkzy]], winner: 0 }),
    ];

    expect(seriesRecord(matches, zen.id)).toStrictEqual({ losses: 1, wins: 1 });
  });

  it("does not count a finished series without a winner", () => {
    const matches = [careerMatch({ id: "void", sides: [[zen], [vatira]], winner: null })];

    expect(seriesRecord(matches, zen.id)).toStrictEqual({ losses: 0, wins: 0 });
  });
});

describe(headToHead, () => {
  it("counts the series each player won against the other", () => {
    const matches = [
      careerMatch({ id: "first", sides: [[zen], [vatira]], winner: 0 }),
      careerMatch({ id: "second", sides: [[vatira], [zen]], winner: 0 }),
      careerMatch({ id: "third", sides: [[vatira], [zen]], winner: 0 }),
    ];

    expect(headToHead(matches, zen.id, vatira.id)).toStrictEqual({ a: 1, b: 2 });
  });

  it("ignores series where both players shared a side or one did not play", () => {
    const matches = [
      careerMatch({ id: "together", sides: [[zen, vatira], [mawkzy]], winner: 0 }),
      careerMatch({ id: "without", sides: [[zen], [mawkzy]], winner: 0 }),
      careerMatch({ finished: false, id: "pending", sides: [[zen], [vatira]], winner: null }),
    ];

    expect(headToHead(matches, zen.id, vatira.id)).toStrictEqual({ a: 0, b: 0 });
  });
});
