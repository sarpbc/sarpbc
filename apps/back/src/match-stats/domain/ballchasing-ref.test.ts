import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { parseBallchasingRef } from "./ballchasing-ref";

const ID = "0d1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("parseBallchasingRef group", () => {
  it.each([
    ["rlcs-2026-paris-major-x1b2c3", "rlcs-2026-paris-major-x1b2c3"],
    ["  https://ballchasing.com/group/rlcs-2026-x1b2c3  ", "rlcs-2026-x1b2c3"],
    ["https://www.ballchasing.com/group/rlcs-2026-x1b2c3/players?x=1", "rlcs-2026-x1b2c3"],
  ])("reads %s", (input, id) => {
    expect(parseBallchasingRef("group", input)).toBe(id);
  });

  it.each([
    "",
    "https://example.com/group/rlcs",
    "https://ballchasing.com/replay/abc-def",
    "https://ballchasing.com/group/",
    "../../etc",
    "a",
  ])("rejects %s", (input) => {
    expect(() => parseBallchasingRef("group", input)).toThrow(InvalidInputError);
  });
});

describe("parseBallchasingRef replay", () => {
  it.each([
    [ID, ID],
    [`  https://ballchasing.com/replay/${ID}  `, ID],
    [`https://www.ballchasing.com/replay/${ID.toUpperCase()}#stats`, ID],
  ])("reads %s", (input, id) => {
    expect(parseBallchasingRef("replay", input)).toBe(id);
  });

  it.each([
    "",
    `https://example.com/replay/${ID}`,
    `https://ballchasing.com/group/${ID}`,
    "https://ballchasing.com/replay/",
    "rlcs-2026-x1b2c3",
    "../../etc",
  ])("rejects %s", (input) => {
    expect(() => parseBallchasingRef("replay", input)).toThrow(InvalidInputError);
  });
});
