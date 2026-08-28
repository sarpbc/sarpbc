import { mapOfficialMatchStreams } from "./official-match-streams";
import type { MatchStreamDto } from "../../infrastructure/dto/match.dto";

function stream(overrides: Partial<MatchStreamDto> = {}): MatchStreamDto {
  return {
    main: false,
    language: "en",
    embed_url: "https://player.twitch.tv/?channel=rlcs",
    official: true,
    raw_url: "https://www.twitch.tv/rocketleague",
    ...overrides,
  };
}

describe("mapOfficialMatchStreams", () => {
  it("returns an empty list when streams are missing", () => {
    expect(mapOfficialMatchStreams(undefined)).toEqual([]);
    expect(mapOfficialMatchStreams([])).toEqual([]);
  });

  it("keeps official http(s) streams and drops unofficial or invalid urls", () => {
    expect(
      mapOfficialMatchStreams([
        stream({ official: false, raw_url: "https://www.twitch.tv/fan" }),
        stream({ language: "fr", raw_url: "https://www.twitch.tv/rocketbaguette", main: true }),
        stream({ raw_url: "javascript:alert(1)" }),
        stream({ raw_url: "not-a-url" }),
        stream({ raw_url: "  https://www.twitch.tv/rocketleague  ", language: "en" }),
      ]),
    ).toEqual([
      { url: "https://www.twitch.tv/rocketbaguette", language: "fr", main: true },
      { url: "https://www.twitch.tv/rocketleague", language: "en", main: false },
    ]);
  });

  it("dedupes by url and caps the list", () => {
    const streams = Array.from({ length: 20 }, (_, index) =>
      stream({
        raw_url: `https://www.twitch.tv/channel-${index}`,
        language: "en",
      }),
    );
    streams.unshift(stream({ raw_url: "https://www.twitch.tv/channel-0", language: "fr" }));

    const mapped = mapOfficialMatchStreams(streams);
    expect(mapped).toHaveLength(12);
    expect(mapped[0]).toEqual({
      url: "https://www.twitch.tv/channel-0",
      language: "fr",
      main: false,
    });
  });
});
