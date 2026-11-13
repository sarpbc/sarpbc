import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkInput } from "./source.ts";

describe("checkInput", () => {
  it("accepts recorded files and https streams", () => {
    assert.doesNotThrow(() => checkInput("vods/match-01.mp4", false));
    assert.doesNotThrow(() => checkInput("C:\\vods\\match-01.mp4", false));
    assert.doesNotThrow(() => checkInput("https://www.twitch.tv/videos/123", false));
    assert.doesNotThrow(() => checkInput("https://www.youtube.com/watch?v=abc", true));
  });

  it("refuses Liquipedia, plain http and live sources that are not URLs", () => {
    assert.throws(
      () => checkInput("https://liquipedia.net/rocketleague/Coupe", false),
      /Liquipedia/,
    );
    assert.throws(() => checkInput("http://www.twitch.tv/slash", true), /https/);
    assert.throws(() => checkInput("match.mp4", true), /stream URL/);
  });
});
