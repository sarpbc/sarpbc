import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orderStreams, parseStreamUrl } from "./stream";

void describe("parseStreamUrl", () => {
  void it("derives the platform and channel of known hosts", () => {
    assert.deepEqual(parseStreamUrl(" https://www.twitch.tv/rocketleague "), {
      channel: "rocketleague",
      ok: true,
      platform: "twitch",
      url: "https://www.twitch.tv/rocketleague",
    });
    assert.deepEqual(parseStreamUrl("https://kick.com/rlfrance"), {
      channel: "rlfrance",
      ok: true,
      platform: "kick",
      url: "https://kick.com/rlfrance",
    });
    assert.deepEqual(parseStreamUrl("https://www.youtube.com/@RocketLeague/live"), {
      channel: "@RocketLeague",
      ok: true,
      platform: "youtube",
      url: "https://www.youtube.com/@RocketLeague/live",
    });
  });

  void it("leaves the channel unknown when the URL does not name it", () => {
    const parsed = parseStreamUrl("https://www.youtube.com/watch?v=abc");
    assert.equal(parsed.ok && parsed.channel, null);
  });

  void it("accepts other https hosts under the other platform", () => {
    assert.deepEqual(parseStreamUrl("https://www.example.tv/live"), {
      channel: "example.tv",
      ok: true,
      platform: "other",
      url: "https://www.example.tv/live",
    });
  });

  void it("rejects non-https and malformed URLs", () => {
    assert.deepEqual(parseStreamUrl("http://twitch.tv/rl"), { error: "not-https", ok: false });
    assert.deepEqual(parseStreamUrl("twitch.tv/rl"), { error: "invalid-url", ok: false });
    assert.deepEqual(parseStreamUrl("https://user@twitch.tv/rl"), {
      error: "invalid-url",
      ok: false,
    });
  });
});

void describe("orderStreams", () => {
  const streams = [
    { kind: "costream" as const, language: "en", url: "a" },
    { kind: "costream" as const, language: "fr", url: "b" },
    { kind: "official" as const, language: "en", url: "c" },
    { kind: "official" as const, language: "fr", url: "d" },
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
