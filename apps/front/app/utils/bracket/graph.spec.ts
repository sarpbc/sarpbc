import { describe, expect, it } from "vitest";
import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/types/matches";
import { getMatchWinnerParticipantId, resolvePreviousMatchId } from "./graph";
import { makeMatch } from "./testHelpers";

describe("resolvePreviousMatchId", () => {
  it("returns string IDs unchanged", () => {
    expect(resolvePreviousMatchId("semi-a")).toBe("semi-a");
  });

  it("extracts id from populated previousMatch objects", () => {
    expect(resolvePreviousMatchId({ id: "semi-a" })).toBe("semi-a");
  });
});

describe("getMatchWinnerParticipantId", () => {
  it("uses explicit winner data when available", () => {
    const match = makeMatch({
      id: "m1",
      winner: { id: "p2" } as Match["winner"],
      participants: [
        { id: "p1" } as Match["participants"][0],
        { id: "p2" } as Match["participants"][1],
      ],
      results: [
        { participant: "p1", score: 1 },
        { participant: "p2", score: 3 },
      ],
    });

    expect(getMatchWinnerParticipantId(match)).toBe("p2");
  });

  it("falls back to scores when winner is missing", () => {
    const match = makeMatch({
      id: "m1",
      participants: [
        { id: "p1" } as Match["participants"][0],
        { id: "p2" } as Match["participants"][1],
      ],
      results: [
        { participant: "p1", score: 4 },
        { participant: "p2", score: 2 },
      ],
    });

    expect(getMatchWinnerParticipantId(match)).toBe("p1");
  });
});

describe("getMatchParticipantScore", () => {
  it("finds scores for string and object participant shapes", () => {
    const results = [
      { participant: "p1", score: 3 },
      { participant: { id: "p2" }, score: 1 },
    ];

    expect(getMatchParticipantScore(results, "p1")).toBe(3);
    expect(getMatchParticipantScore(results, "p2")).toBe(1);
    expect(getMatchParticipantScore(results, "missing")).toBeNull();
  });
});
