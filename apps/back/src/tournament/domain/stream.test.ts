import type { Stream, StreamInput } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { Tournament } from "./tournament";
import { pandascoreStreams, replaceStreams } from "./stream";

const official: StreamInput = {
  url: "https://twitch.tv/rlesports",
  language: "en",
  kind: "official",
};

const costream: StreamInput = { url: "https://kick.com/kameto", language: "fr", kind: "costream" };

const stream = (url: string, source: Stream["source"] = "manual"): Stream => {
  const streamUrl = replaceStreams([], [{ url, language: "en", kind: "official" }], "manual").at(0);

  if (streamUrl === undefined) {
    throw new Error("fixture");
  }

  return { ...streamUrl, source };
};

const matchIn = (tournament: { streams: Stream[]; eventStreams: Stream[] }): Match =>
  Object.assign(new Match(), {
    tournament: {
      id: "stage",
      name: "Playoffs",
      slug: "playoffs",
      event: { id: "event", slug: "rlcs", name: "RLCS" },
      beginAt: null,
      league: null,
      pickemsEnabled: false,
      source: "manual",
      pandascoreId: null,
      ...tournament,
    },
  });

describe(replaceStreams, () => {
  it("normalizes each stream and derives its platform and channel", () => {
    expect(
      replaceStreams([], [official, { ...costream, language: " FR " }], "manual"),
    ).toStrictEqual([
      {
        url: "https://twitch.tv/rlesports",
        platform: "twitch",
        channel: "rlesports",
        language: "en",
        kind: "official",
        source: "manual",
      },
      {
        url: "https://kick.com/kameto",
        platform: "kick",
        channel: "kameto",
        language: "fr",
        kind: "costream",
        source: "manual",
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
        { url: "https://www.twitch.tv/rocketleague_es", language: "es", main: false },
        { url: "https://www.twitch.tv/rocketleague", language: "en", main: true },
        { url: "not a url", language: "en", main: false },
        { url: "https://www.twitch.tv/unknown", language: "", main: false },
      ]),
    ).toStrictEqual([
      {
        url: "https://www.twitch.tv/rocketleague",
        platform: "twitch",
        channel: "rocketleague",
        language: "en",
        kind: "official",
        source: "pandascore",
      },
      {
        url: "https://www.twitch.tv/rocketleague_es",
        platform: "twitch",
        channel: "rocketleague_es",
        language: "es",
        kind: "official",
        source: "pandascore",
      },
    ]);
  });
});

describe("pandascoreStreams upgrades", () => {
  it("serves a PandaScore http link over https", () => {
    expect(
      pandascoreStreams([{ url: "http://www.twitch.tv/legacy", language: "en", main: true }]).map(
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
    const match = matchIn({ streams: [stageStream], eventStreams: [eventStream] });
    expect(match.watchStreams()).toStrictEqual([stageStream]);
  });

  it("falls back to the event list when neither the match nor the tournament has one", () => {
    const match = matchIn({ streams: [], eventStreams: [eventStream] });
    expect(match.watchStreams()).toStrictEqual([eventStream]);
    expect(
      Object.assign(new Tournament(), { eventStreams: [eventStream] }).watchStreams(),
    ).toStrictEqual([eventStream]);
  });

  it("replaces the inherited list entirely with the match override", () => {
    const match = matchIn({ streams: [stageStream], eventStreams: [eventStream] });
    match.streams = [matchStream];
    expect(match.watchStreams()).toStrictEqual([matchStream]);
    expect(match.inheritedStreams()).toStrictEqual([stageStream]);
  });

  it("prefers the PandaScore match feed over the tournament list, and staff overrides over both", () => {
    const match = matchIn({ streams: [stageStream], eventStreams: [] });
    match.officialStreams = [{ url: "https://twitch.tv/rocketleague", language: "en", main: true }];
    expect(match.watchStreams().map((s) => s.source)).toStrictEqual(["pandascore"]);
    match.streams = [matchStream];
    expect(match.watchStreams()).toStrictEqual([matchStream]);
  });

  it("prefers a tournament list over its event list", () => {
    const tournament = Object.assign(new Tournament(), {
      streams: [stageStream],
      eventStreams: [eventStream],
    });

    expect(tournament.watchStreams()).toStrictEqual([stageStream]);
  });
});
