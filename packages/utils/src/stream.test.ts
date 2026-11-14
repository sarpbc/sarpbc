import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orderStreams, parseStreamUrl } from "./stream";

void describe("parseStreamUrl", () => {
  void it("derives the platform and channel of known hosts", () => {
    assert.deepEqual(parseStreamUrl(" https://www.twitch.tv/rocketleague "), {
      ok: true,
      url: "https://www.twitch.tv/rocketleague",
      platform: "twitch",
      channel: "rocketleague",
    });
    assert.deepEqual(parseStreamUrl("https://kick.com/rlfrance"), {
      ok: true,
      url: "https://kick.com/rlfrance",
      platform: "kick",
      channel: "rlfrance",
    });
    assert.deepEqual(parseStreamUrl("https://www.youtube.com/@RocketLeague/live"), {
      ok: true,
      url: "https://www.youtube.com/@RocketLeague/live",
      platform: "youtube",
      channel: "@RocketLeague",
    });
  });

  void it("leaves the channel unknown when the URL does not name it", () => {
    const parsed = parseStreamUrl("https://www.youtube.com/watch?v=abc");
    assert.equal(parsed.ok && parsed.channel, null);
  });

  void it("accepts other https hosts under the other platform", () => {
    assert.deepEqual(parseStreamUrl("https://www.example.tv/live"), {
      ok: true,
      url: "https://www.example.tv/live",
      platform: "other",
      channel: "example.tv",
    });
  });

  void it("rejects non-https and malformed URLs", () => {
    assert.deepEqual(parseStreamUrl("http://twitch.tv/rl"), { ok: false, error: "not-https" });
    assert.deepEqual(parseStreamUrl("twitch.tv/rl"), { ok: false, error: "invalid-url" });
    assert.deepEqual(parseStreamUrl("https://user@twitch.tv/rl"), {
      ok: false,
      error: "invalid-url",
    });
  });
});

void describe("orderStreams", () => {
  const streams = [
    { url: "a", language: "en", kind: "costream" as const },
    { url: "b", language: "fr", kind: "costream" as const },
    { url: "c", language: "en", kind: "official" as const },
    { url: "d", language: "fr", kind: "official" as const },
  ];

  void it("puts the reader's language first, then official streams", () => {
    assert.deepEqual(
      orderStreams(streams, "fr").map(({ url }) => url),
      ["d", "b", "c", "a"],
    );
    assert.deepEqual(
      orderStreams(streams, "de").map(({ url }) => url),
      ["c", "d", "a", "b"],
    );
  });
});
