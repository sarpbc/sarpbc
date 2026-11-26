import { describe, expect, it } from "vitest";
import { deriveStageWinner } from "./stage-winner";
import type { StageOutcome, StageOutcomeMatch } from "./stage-winner";

const match = (id: string, winnerId: string | null, previousMatchIds: string[] = []) =>
  ({ id, previousMatchIds, winnerId }) satisfies StageOutcomeMatch;

const outcome = (overrides: Partial<StageOutcome>) =>
  ({
    firstPlaceIds: [],
    matches: [],
    source: "manual",
    winnerId: null,
    ...overrides,
  }) satisfies StageOutcome;

const bracket = (finalWinnerId: string | null) => [
  match("semi-1", "alpha"),
  match("semi-2", "beta"),
  match("final", finalWinnerId, ["semi-1", "semi-2"]),
];

describe(deriveStageWinner, () => {
  it("crowns the winner of the bracket final", () => {
    expect(deriveStageWinner(outcome({ matches: bracket("beta") }))).toBe("beta");
  });

  it("prefers the bracket final over the first-place prize", () => {
    expect(deriveStageWinner(outcome({ firstPlaceIds: ["alpha"], matches: bracket("beta") }))).toBe(
      "beta",
    );
  });

  it("falls back to the first-place prize while the final is undecided", () => {
    expect(deriveStageWinner(outcome({ firstPlaceIds: ["alpha"], matches: bracket(null) }))).toBe(
      "alpha",
    );
  });

  it("falls back to the first-place prize when the bracket has no single final", () => {
    const matches = [
      match("upper", "alpha", ["a"]),
      match("lower", "beta", ["b"]),
      match("a", "alpha"),
      match("b", "beta"),
    ];

    expect(deriveStageWinner(outcome({ firstPlaceIds: ["gamma"], matches }))).toBe("gamma");
  });

  it("ignores matches outside a bracket", () => {
    expect(deriveStageWinner(outcome({ matches: [match("show", "alpha")] }))).toBeNull();
  });

  it("names no winner when first place is shared or missing", () => {
    expect(deriveStageWinner(outcome({ firstPlaceIds: ["alpha", "beta"] }))).toBeNull();
    expect(deriveStageWinner(outcome({}))).toBeNull();
  });
});
