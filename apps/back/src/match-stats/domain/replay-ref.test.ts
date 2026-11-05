import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { parseBallchasingReplayId } from "./replay-ref";

const ID = "0d1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("parseBallchasingReplayId", () => {
  it.each([
    [ID, ID],
    [`  https://ballchasing.com/replay/${ID}  `, ID],
    [`https://www.ballchasing.com/replay/${ID.toUpperCase()}#stats`, ID],
  ])("reads %s", (input, id) => {
    expect(parseBallchasingReplayId(input)).toBe(id);
  });

  it.each([
    "",
    `https://example.com/replay/${ID}`,
    `https://ballchasing.com/group/${ID}`,
    "https://ballchasing.com/replay/",
    "rlcs-2026-x1b2c3",
    "../../etc",
  ])("rejects %s", (input) => {
    expect(() => parseBallchasingReplayId(input)).toThrow(InvalidInputError);
  });
});
