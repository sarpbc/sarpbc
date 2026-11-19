import { SCRIPT_URL } from "../../../../test/doubles";
import { describe, expect, it } from "vitest";
import { mapOfficialMatchStreams } from "./official-match-streams";
import type { MatchStreamDto } from "../dto/match.dto";

const stream = (overrides: Partial<MatchStreamDto> = {}) => ({
  embed_url: "https://player.twitch.tv/?channel=rlcs",
  language: "en",
  main: false,
  official: true,
  raw_url: "https://www.twitch.tv/rocketleague",
  ...overrides,
});

describe(mapOfficialMatchStreams, () => {
  it("returns an empty list when streams are missing", () => {
    expect(mapOfficialMatchStreams(undefined)).toStrictEqual([]);
    expect(mapOfficialMatchStreams([])).toStrictEqual([]);
  });

  it("keeps official http(s) streams and drops unofficial or invalid urls", () => {
    expect(
      mapOfficialMatchStreams([
        stream({ official: false, raw_url: "https://www.twitch.tv/fan" }),
        stream({ language: "fr", main: true, raw_url: "https://www.twitch.tv/rocketbaguette" }),
        stream({ raw_url: SCRIPT_URL }),
        stream({ raw_url: "not-a-url" }),
        stream({ language: "en", raw_url: "  https://www.twitch.tv/rocketleague  " }),
      ]),
    ).toStrictEqual([
      { language: "fr", main: true, url: "https://www.twitch.tv/rocketbaguette" },
      { language: "en", main: false, url: "https://www.twitch.tv/rocketleague" },
    ]);
  });

  it("dedupes by url and caps the list", () => {
    const streams = Array.from({ length: 20 }, (_, index) =>
      stream({
        language: "en",
        raw_url: `https://www.twitch.tv/channel-${index}`,
      }),
    );

    streams.unshift(stream({ language: "fr", raw_url: "https://www.twitch.tv/channel-0" }));

    const mapped = mapOfficialMatchStreams(streams);
    expect(mapped).toHaveLength(12);
    expect(mapped[0]).toStrictEqual({
      language: "fr",
      main: false,
      url: "https://www.twitch.tv/channel-0",
    });
  });
});
