import { describe, expect, it } from "vitest";
import { CreateMatchDto, UpdateMatchDto } from "./create-match.dto";

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

describe("update-match body", () => {
  it("accepts a finished score, a live score or a status alone", () => {
    expect(UpdateMatchDto.safeParse({ ...result(3, 1), status: "finished" }).success).toBe(true);
    expect(UpdateMatchDto.safeParse({ ...result(2, 2), status: "running" }).success).toBe(true);
    expect(UpdateMatchDto.safeParse({ status: "not_started" }).success).toBe(true);
  });

  it("accepts a schedule, a name or a best-of length alone", () => {
    expect(UpdateMatchDto.safeParse({ beginAt: "2026-11-12T18:00:00+01:00" }).success).toBe(true);
    expect(UpdateMatchDto.safeParse({ beginAt: null, endAt: null }).success).toBe(true);
    expect(UpdateMatchDto.safeParse({ name: "Grand Final" }).success).toBe(true);
    expect(UpdateMatchDto.safeParse({ numberOfGames: 7 }).success).toBe(true);
    expect(UpdateMatchDto.safeParse({ numberOfGames: null }).success).toBe(true);
  });

  it("refuses a blank name, a best-of length out of range or a malformed date", () => {
    expect(UpdateMatchDto.safeParse({ name: " " }).success).toBe(false);
    expect(UpdateMatchDto.safeParse({ numberOfGames: 0 }).success).toBe(false);
    expect(UpdateMatchDto.safeParse({ beginAt: "tomorrow" }).success).toBe(false);
  });

  it("refuses an empty body, an unknown status or a drawn finished series", () => {
    expect(UpdateMatchDto.safeParse({}).success).toBe(false);
    expect(UpdateMatchDto.safeParse({ status: "canceled" }).success).toBe(false);
    expect(UpdateMatchDto.safeParse({ ...result(2, 2), status: "finished" }).success).toBe(false);
  });

  it("refuses a repeated side, a single side or a negative score", () => {
    expect(UpdateMatchDto.safeParse(result(3, 1, "a")).success).toBe(false);
    expect(UpdateMatchDto.safeParse(result(-1, 3)).success).toBe(false);
    expect(UpdateMatchDto.safeParse({ results: [{ participantId: "a", score: 3 }] }).success).toBe(
      false,
    );
  });
});
