import { describe, expect, it } from "vitest";
import { pickOfficialStreamUrl, type OfficialMatchStream } from "./officialStream";

const streams: OfficialMatchStream[] = [
  { url: "https://www.twitch.tv/rocketleague", language: "en", main: true },
  { url: "https://www.twitch.tv/rocketbaguette", language: "fr", main: false },
];

describe("pickOfficialStreamUrl", () => {
  it("returns null when there are no streams", () => {
    expect(pickOfficialStreamUrl(undefined, "en-US")).toBeNull();
    expect(pickOfficialStreamUrl([], "fr-FR")).toBeNull();
  });

  it("prefers a stream matching the locale language", () => {
    expect(pickOfficialStreamUrl(streams, "fr-FR")).toBe("https://www.twitch.tv/rocketbaguette");
    expect(pickOfficialStreamUrl(streams, "en-US")).toBe("https://www.twitch.tv/rocketleague");
  });

  it("falls back to the main stream then the first stream", () => {
    expect(
      pickOfficialStreamUrl(
        [
          { url: "https://www.twitch.tv/es", language: "es", main: false },
          { url: "https://www.twitch.tv/main", language: "de", main: true },
        ],
        "fr-FR",
      ),
    ).toBe("https://www.twitch.tv/main");

    expect(
      pickOfficialStreamUrl(
        [{ url: "https://www.twitch.tv/only", language: "es", main: false }],
        "en-US",
      ),
    ).toBe("https://www.twitch.tv/only");
  });
});
