import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { parseBallchasingGroupId } from "./group-ref";

describe("parseBallchasingGroupId", () => {
  it.each([
    ["rlcs-2026-paris-major-x1b2c3", "rlcs-2026-paris-major-x1b2c3"],
    ["  https://ballchasing.com/group/rlcs-2026-x1b2c3  ", "rlcs-2026-x1b2c3"],
    ["https://www.ballchasing.com/group/rlcs-2026-x1b2c3/players?x=1", "rlcs-2026-x1b2c3"],
  ])("reads %s", (input, id) => {
    expect(parseBallchasingGroupId(input)).toBe(id);
  });

  it.each([
    "",
    "https://example.com/group/rlcs",
    "https://ballchasing.com/replay/abc-def",
    "https://ballchasing.com/group/",
    "../../etc",
    "a",
  ])("rejects %s", (input) => {
    expect(() => parseBallchasingGroupId(input)).toThrow(InvalidInputError);
  });
});
