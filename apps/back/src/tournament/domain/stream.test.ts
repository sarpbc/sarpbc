import type { Stream, StreamInput } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { Tournament } from "./tournament";
import { pandascoreStreams, replaceStreams } from "./stream";

const official: StreamInput = {
  kind: "official",
  language: "en",
  url: "https://twitch.tv/rlesports",
};

const costream: StreamInput = { kind: "costream", language: "fr", url: "https://kick.com/kameto" };

const stream = (url: string, source: Stream["source"] = "manual") => {
  const streamUrl = replaceStreams([], [{ kind: "official", language: "en", url }], "manual").at(0);

  if (streamUrl === undefined) {
    throw new Error("fixture");
  }

  return { ...streamUrl, source };
};

const matchIn = (tournament: { streams: Stream[]; eventStreams: Stream[] }) =>
  Object.assign(new Match(), {
    tournament: {
      beginAt: null,
      event: { id: "event", name: "RLCS", slug: "rlcs" },
      id: "stage",
      league: null,
      name: "Playoffs",
      pandascoreId: null,
      pickemsEnabled: false,
      slug: "playoffs",
      source: "manual",
      ...tournament,
    },
  });

describe(replaceStreams, () => {
  it("normalizes each stream and derives its platform and channel", () => {
    expect(
      replaceStreams([], [official, { ...costream, language: " FR " }], "manual"),
    ).toStrictEqual([
      {
        channel: "rlesports",
        kind: "official",
        language: "en",
        platform: "twitch",
        source: "manual",
        url: "https://twitch.tv/rlesports",
      },
      {
        channel: "kameto",
        kind: "costream",
        language: "fr",
        platform: "kick",
        source: "manual",
        url: "https://kick.com/kameto",
      },
    ]);
  });

  it("keeps an explicit channel name and drops duplicate URLs", () => {
    const streams = replaceStreams(
      [],
      [{ ...official, channel: "RLEsports B" }, official],
      "manual",
    );

    expect(streams).toHaveLength(1);
    expect(streams[0]?.channel).toBe("RLEsports B");
  });

  it("rejects invalid URLs, languages and unnamed channels", () => {
    expect(() =>
      replaceStreams([], [{ ...official, url: "http://twitch.tv/rl" }], "manual"),
    ).toThrow("Stream 1 must use https.");
    expect(() => replaceStreams([], [official, { ...costream, language: "xx" }], "manual")).toThrow(
      "Stream 2 needs a two-letter ISO 639-1 language code",
    );
    expect(() =>
      replaceStreams([], [{ ...official, url: "https://www.youtube.com/watch?v=abc" }], "manual"),
    ).toThrow("Stream 1 needs a channel name.");
  });

  it("rejects a list longer than the maximum", () => {
    const many = Array.from({ length: 13 }, (_, index) => ({
      ...official,
      url: `https://twitch.tv/channel${index}`,
    }));

    expect(() => replaceStreams([], many, "manual")).toThrow("at most 12 streams");
  });

  it("marks every stream of a start.gg sourced list", () => {
    expect(replaceStreams([], [official], "startgg").map((s) => s.source)).toStrictEqual([
      "startgg",
    ]);
  });

  it("keeps the start.gg mark of a stream a staff edit carries over", () => {
    const current = replaceStreams([], [official], "startgg");

    const edited = replaceStreams(
      current,
      [{ ...official, channel: "Renamed" }, costream],
      "manual",
    );

    expect(edited.map((s) => [s.url, s.source])).toStrictEqual([
      ["https://twitch.tv/rlesports", "startgg"],
      ["https://kick.com/kameto", "manual"],
    ]);
  });
});

describe(pandascoreStreams, () => {
  it("puts the main stream first and skips unusable entries", () => {
    expect(
      pandascoreStreams([
        { language: "es", main: false, url: "https://www.twitch.tv/rocketleague_es" },
        { language: "en", main: true, url: "https://www.twitch.tv/rocketleague" },
        { language: "en", main: false, url: "not a url" },
        { language: "", main: false, url: "https://www.twitch.tv/unknown" },
      ]),
    ).toStrictEqual([
      {
        channel: "rocketleague",
        kind: "official",
        language: "en",
        platform: "twitch",
        source: "pandascore",
        url: "https://www.twitch.tv/rocketleague",
      },
      {
        channel: "rocketleague_es",
        kind: "official",
        language: "es",
        platform: "twitch",
        source: "pandascore",
        url: "https://www.twitch.tv/rocketleague_es",
      },
    ]);
  });
});

describe("pandascoreStreams upgrades", () => {
  it("serves a PandaScore http link over https", () => {
    expect(
      pandascoreStreams([{ language: "en", main: true, url: "http://www.twitch.tv/legacy" }]).map(
        (s) => s.url,
      ),
    ).toStrictEqual(["https://www.twitch.tv/legacy"]);
  });
});

describe("watch streams", () => {
  const eventStream = stream("https://twitch.tv/event");
  const stageStream = stream("https://twitch.tv/stage");
  const matchStream = stream("https://twitch.tv/stream-b");

  it("shows the tournament list on a match without its own list", () => {
    const match = matchIn({ eventStreams: [eventStream], streams: [stageStream] });
    expect(match.watchStreams()).toStrictEqual([stageStream]);
  });

  it("falls back to the event list when neither the match nor the tournament has one", () => {
    const match = matchIn({ eventStreams: [eventStream], streams: [] });
    expect(match.watchStreams()).toStrictEqual([eventStream]);
    expect(
      Object.assign(new Tournament(), { eventStreams: [eventStream] }).watchStreams(),
    ).toStrictEqual([eventStream]);
  });

  it("replaces the inherited list entirely with the match override", () => {
    const match = matchIn({ eventStreams: [eventStream], streams: [stageStream] });
    match.streams = [matchStream];
    expect(match.watchStreams()).toStrictEqual([matchStream]);
    expect(match.inheritedStreams()).toStrictEqual([stageStream]);
  });

  it("prefers the PandaScore match feed over the tournament list, and staff overrides over both", () => {
    const match = matchIn({ eventStreams: [], streams: [stageStream] });
    match.officialStreams = [{ language: "en", main: true, url: "https://twitch.tv/rocketleague" }];
    expect(match.watchStreams().map((s) => s.source)).toStrictEqual(["pandascore"]);
    match.streams = [matchStream];
    expect(match.watchStreams()).toStrictEqual([matchStream]);
  });

  it("prefers a tournament list over its event list", () => {
    const tournament = Object.assign(new Tournament(), {
      eventStreams: [eventStream],
      streams: [stageStream],
    });

    expect(tournament.watchStreams()).toStrictEqual([stageStream]);
  });
});
