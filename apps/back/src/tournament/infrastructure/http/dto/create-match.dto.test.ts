import { describe, expect, it } from "vitest";
import { CreateMatchDto } from "./create-match.dto";

describe("CreateMatchDto", () => {
  const valid = { name: "Final", participantIds: ["a", "b"] };

  it("accepts a manual match", () => {
    expect(CreateMatchDto.safeParse(valid).success).toBe(true);
  });

  it("refuses a staff-supplied PandaScore identity", () => {
    expect(CreateMatchDto.safeParse({ ...valid, pandascoreId: 12 }).success).toBe(false);
  });
});
