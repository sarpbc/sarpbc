import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TWITCH_LOGIN_PATTERN } from "./twitch";

void describe("TWITCH_LOGIN_PATTERN", () => {
  for (const login of ["a", "ab", "abc", "zenrll", "rocket_league_1", "1v1", "a".repeat(25)]) {
    void it(`accepts ${JSON.stringify(login)}`, () => {
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
    void it(`rejects ${JSON.stringify(login)}`, () => {
      assert.equal(TWITCH_LOGIN_PATTERN.test(login), false);
    });
  }
});
