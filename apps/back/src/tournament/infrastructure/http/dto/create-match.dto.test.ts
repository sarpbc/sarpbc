import { describe, expect, it } from "vitest";
import { CreateMatchDto, SetMatchResultDto } from "./create-match.dto";

describe(CreateMatchDto, () => {
  const valid = { name: "Final", participantIds: ["a", "b"] };

  it("accepts a manual match", () => {
    expect(CreateMatchDto.safeParse(valid).success).toBe(true);
  });

  it("refuses a staff-supplied PandaScore identity", () => {
    expect(CreateMatchDto.safeParse({ ...valid, pandascoreId: 12 }).success).toBe(false);
  });
});

const result = (a: number, b: number, second = "b") => ({
  results: [
    { participantId: "a", score: a },
    { participantId: second, score: b },
  ],
});

describe(SetMatchResultDto, () => {
  it("accepts the series score of both sides", () => {
    expect(SetMatchResultDto.safeParse(result(3, 1)).success).toBe(true);
  });

  it("refuses a drawn series, a repeated side, a single side or a negative score", () => {
    expect(SetMatchResultDto.safeParse(result(2, 2)).success).toBe(false);
    expect(SetMatchResultDto.safeParse(result(3, 1, "a")).success).toBe(false);
    expect(SetMatchResultDto.safeParse(result(-1, 3)).success).toBe(false);
    expect(
      SetMatchResultDto.safeParse({ results: [{ participantId: "a", score: 3 }] }).success,
    ).toBe(false);
  });
});
