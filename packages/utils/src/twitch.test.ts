import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TWITCH_LOGIN_PATTERN } from "./twitch.ts";

describe("TWITCH_LOGIN_PATTERN", () => {
  for (const login of ["a", "ab", "abc", "zenrll", "rocket_league_1", "1v1", "a".repeat(25)]) {
    it(`accepts ${JSON.stringify(login)}`, () => {
      assert.equal(TWITCH_LOGIN_PATTERN.test(login), true);
    });
  }

  for (const login of [
    "",
    "_zenrll",
    "a".repeat(26),
    "zen-rll",
    "zen rll",
    "ZenRLL",
    "zén",
    "https://twitch.tv/zenrll",
  ]) {
    it(`rejects ${JSON.stringify(login)}`, () => {
      assert.equal(TWITCH_LOGIN_PATTERN.test(login), false);
    });
  }

  it("rejects a long adversarial login within the time budget", () => {
    const payload = `${"a_".repeat(50_000)}!`;
    const startedAt = performance.now();

    assert.equal(TWITCH_LOGIN_PATTERN.test(payload), false);
    assert.ok(performance.now() - startedAt < 100);
  });
});
