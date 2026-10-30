import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { MAX_VODS_PER_GAME } from "@sarpbc/utils";
import { normalizeMatchVods, replaceGameVods } from "./match-vod";

const vod = (url: string, overrides: Partial<{ game: number; language: string }> = {}) => ({
  game: 1,
  language: "en",
  url,
  ...overrides,
});

describe("normalizeMatchVods", () => {
  it.each([
    ["https://www.twitch.tv/videos/2245891234?t=1h2m3s", "twitch"],
    ["https://twitch.tv/videos/2245891234", "twitch"],
    ["https://m.twitch.tv/videos/2245891234?t=90s", "twitch"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123", "youtube"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=2m5s", "youtube"],
    ["https://youtube.com/live/dQw4w9WgXcQ", "youtube"],
    ["https://youtu.be/dQw4w9WgXcQ?t=3600", "youtube"],
    ["https://WWW.YouTube.com/watch?v=dQw4w9WgXcQ", "youtube"],
  ])("accepts %s as %s", (url, source) => {
    expect(normalizeMatchVods([vod(url)], 5)).toEqual([
      expect.objectContaining({ game: 1, language: "en", source }),
    ]);
  });

  it.each([
    ["http://www.twitch.tv/videos/1", "must use https"],
    ["not a url", "is not a valid URL"],
    ["https://vimeo.com/123", "must be a twitch.tv"],
    ["https://twitch.tv.evil.example/videos/1", "must be a twitch.tv"],
    ["https://clips.twitch.tv/abc", "must be a twitch.tv"],
    ["https://music.youtube.com/watch?v=x", "must be a twitch.tv"],
    ["https://www.youtube.com:8443/watch?v=x", "must be a twitch.tv"],
    ["https://user:pass@www.youtube.com/watch?v=x", "must be a twitch.tv"],
    ["javascript:alert(1)", "must use https"],
    ["https://www.twitch.tv/videos/1?t=1h2x", "invalid t= timestamp"],
    ["https://youtu.be/x?t=", "invalid t= timestamp"],
    ["https://youtu.be/x?t=-5", "invalid t= timestamp"],
    ["https://youtu.be/x?t=95&t=abc", "invalid t= timestamp"],
  ])("rejects %s", (url, message) => {
    expect(() => normalizeMatchVods([vod(url)], 5)).toThrow(message);
  });

  it("normalizes the language and rejects codes outside ISO 639-1", () => {
    expect(
      normalizeMatchVods([vod("https://youtu.be/a", { language: " FR " })], 5)[0]?.language,
    ).toBe("fr");
    for (const language of ["aa", "ja", "zu"])
      expect(normalizeMatchVods([vod("https://youtu.be/a", { language })], 5)[0]?.language).toBe(
        language,
      );
    for (const language of ["fra", "xx", "zz", "e1", "", "en-US"])
      expect(() => normalizeMatchVods([vod("https://youtu.be/a", { language })], 5)).toThrow(
        InvalidInputError,
      );
  });

  it("checks a declared source against the host", () => {
    expect(() =>
      normalizeMatchVods([{ ...vod("https://youtu.be/a"), source: "twitch" }], 5),
    ).toThrow("is a youtube link, not twitch");
    expect(
      normalizeMatchVods([{ ...vod("https://youtu.be/a"), source: "youtube" }], 5)[0]?.source,
    ).toBe("youtube");
  });

  it("bounds the game number by the match format", () => {
    expect(() => normalizeMatchVods([vod("https://youtu.be/a", { game: 6 })], 5)).toThrow(
      "between 1 and 5",
    );
    expect(() => normalizeMatchVods([vod("https://youtu.be/a", { game: 0 })], null)).toThrow(
      "between 1 and 9",
    );
    expect(() => normalizeMatchVods([vod("https://youtu.be/a", { game: 1.5 })], null)).toThrow(
      InvalidInputError,
    );
    expect(normalizeMatchVods([vod("https://youtu.be/a", { game: 9 })], null)).toHaveLength(1);
  });

  it("keeps several languages and sources per game, drops repeated URLs and sorts by game", () => {
    const vods = normalizeMatchVods(
      [
        vod("https://youtu.be/g2", { game: 2 }),
        vod("https://www.twitch.tv/videos/1?t=10", { language: "fr" }),
        vod("https://youtu.be/g1", { language: "de" }),
        vod("https://www.twitch.tv/videos/1?t=10", { language: "es" }),
        vod("https://youtu.be/g2", { game: 3 }),
      ],
      5,
    );
    expect(vods.map((v) => [v.game, v.source, v.language])).toEqual([
      [1, "twitch", "fr"],
      [1, "youtube", "de"],
      [2, "youtube", "en"],
      [3, "youtube", "en"],
    ]);
  });

  it("limits the number of links per game", () => {
    const links = Array.from({ length: MAX_VODS_PER_GAME + 1 }, (_, i) =>
      vod(`https://youtu.be/v${i}`),
    );
    expect(() => normalizeMatchVods(links, 5)).toThrow(
      `Game 1 has more than ${MAX_VODS_PER_GAME} VOD links.`,
    );
    expect(normalizeMatchVods(links.slice(1), 5)).toHaveLength(MAX_VODS_PER_GAME);
  });
});

describe("replaceGameVods", () => {
  const current = normalizeMatchVods(
    [vod("https://youtu.be/g1"), vod("https://youtu.be/g2", { game: 2 })],
    5,
  );

  it("replaces only the targeted game", () => {
    expect(
      replaceGameVods(current, 1, [{ url: "https://twitch.tv/videos/9", language: "fr" }], 5),
    ).toEqual([
      { game: 1, url: "https://twitch.tv/videos/9", language: "fr", source: "twitch" },
      { game: 2, url: "https://youtu.be/g2", language: "en", source: "youtube" },
    ]);
  });

  it("clears a game with an empty list", () => {
    expect(replaceGameVods(current, 2, [], 5).map((v) => v.game)).toEqual([1]);
  });

  it("rejects a game outside the match format even when clearing it", () => {
    for (const game of [0, 6, 1.5])
      expect(() => replaceGameVods(current, game, [], 5)).toThrow("Game must be between 1 and 5.");
  });
});
