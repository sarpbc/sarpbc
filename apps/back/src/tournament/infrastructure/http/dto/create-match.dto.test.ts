import { describe, expect, it } from "vitest";
import { CreateMatchDto, UpdateMatchResultDto } from "./create-match.dto";

describe("create-match body", () => {
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

describe("update-match-result body", () => {
  it("accepts a finished score, a live score or a status alone", () => {
    expect(UpdateMatchResultDto.safeParse({ ...result(3, 1), status: "finished" }).success).toBe(
      true,
    );
    expect(UpdateMatchResultDto.safeParse({ ...result(2, 2), status: "running" }).success).toBe(
      true,
    );
    expect(UpdateMatchResultDto.safeParse({ status: "not_started" }).success).toBe(true);
  });

  it("refuses an empty body, an unknown status or a drawn finished series", () => {
    expect(UpdateMatchResultDto.safeParse({}).success).toBe(false);
    expect(UpdateMatchResultDto.safeParse({ status: "canceled" }).success).toBe(false);
    expect(UpdateMatchResultDto.safeParse({ ...result(2, 2), status: "finished" }).success).toBe(
      false,
    );
  });

  it("refuses a repeated side, a single side or a negative score", () => {
    expect(UpdateMatchResultDto.safeParse(result(3, 1, "a")).success).toBe(false);
    expect(UpdateMatchResultDto.safeParse(result(-1, 3)).success).toBe(false);
    expect(
      UpdateMatchResultDto.safeParse({ results: [{ participantId: "a", score: 3 }] }).success,
    ).toBe(false);
  });
});
