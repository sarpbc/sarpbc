import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkInput } from "./source.ts";

void describe("checkInput", () => {
  void it("accepts recorded files and https streams", () => {
    assert.doesNotThrow(() => {
      checkInput("vods/match-01.mp4", false);
    });
    assert.doesNotThrow(() => {
      checkInput("C:\\vods\\match-01.mp4", false);
    });
    assert.doesNotThrow(() => {
      checkInput("https://www.twitch.tv/videos/123", false);
    });
    assert.doesNotThrow(() => {
      checkInput("https://www.youtube.com/watch?v=abc", true);
    });
  });

  void it("refuses Liquipedia, plain http and live sources that are not URLs", () => {
    assert.throws(() => {
      checkInput("https://liquipedia.net/rocketleague/Coupe", false);
    }, /Liquipedia/u);
    assert.throws(() => {
      checkInput("http://www.twitch.tv/slash", true);
    }, /https/u);
    assert.throws(() => {
      checkInput("match.mp4", true);
    }, /stream URL/u);
  });
});
