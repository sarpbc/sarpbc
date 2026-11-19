import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { MemoryLiveStreamCache } from "./ports/live-stream-cache.test-utils";
import { MemoryLiveStreamSource } from "./ports/live-stream-source.test-utils";
import { MemoryTrackedStreamerStore } from "./ports/tracked-streamer-store.test-utils";
import { LIVE_STREAMS_FRESH_MS, StreamerService } from "./streamer.service";
import type { StreamerFailureReporter } from "./streamer.service";

const now = new Date("2026-10-31T20:00:00Z");

const tracked = (login: string, displayName: string | null = null) => ({
  createdAt: now,
  displayName,
  id: `${login}-id`,
  login,
});

const live = (login: string, viewerCount: number) => ({
  displayName: login.toUpperCase(),
  login,
  title: `${login} ranked`,
  viewerCount,
});

const setup = (trackedStreamers = [tracked("zenrll", "Zen"), tracked("kaydop")]) => {
  const streamers = new MemoryTrackedStreamerStore(trackedStreamers);
  const source = new MemoryLiveStreamSource([live("kaydop", 100), live("zenrll", 900)]);
  const cache = new MemoryLiveStreamCache();
  const reportFailure = vi.fn<StreamerFailureReporter>();

  return {
    cache,
    reportFailure,
    service: new StreamerService(streamers, source, cache, reportFailure, () => now),
    source,
    streamers,
  };
};

describe(StreamerService, () => {
  it("returns an empty list when the feature is off", async () => {
    const { cache, reportFailure, streamers } = setup();
    const service = new StreamerService(streamers, null, cache, reportFailure, () => now);

    await expect(service.listLive()).resolves.toStrictEqual([]);
  });

  it("fetches tracked logins, applies display names and sorts by viewers", async () => {
    const { service, source } = setup();

    const result = await service.listLive();

    expect(source.requests).toStrictEqual([["zenrll", "kaydop"]]);
    expect(result).toStrictEqual([
      {
        displayName: "Zen",
        login: "zenrll",
        title: "zenrll ranked",
        url: "https://twitch.tv/zenrll",
        viewerCount: 900,
      },
      {
        displayName: "KAYDOP",
        login: "kaydop",
        title: "kaydop ranked",
        url: "https://twitch.tv/kaydop",
        viewerCount: 100,
      },
    ]);
  });

  it("serves a fresh cached result without calling Twitch", async () => {
    const { cache, service, source } = setup();
    cache.snapshot = {
      fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS + 1),
      streams: [],
    };

    await expect(service.listLive()).resolves.toStrictEqual([]);
    expect(source.requests).toStrictEqual([]);
  });

  it("calls Twitch once for successive visitors within the cache window", async () => {
    const { service, source } = setup();

    await service.listLive();
    await service.listLive();
    await service.listLive();

    expect(source.requests).toHaveLength(1);
  });

  it("serves the stale result while another instance refreshes", async () => {
    const { cache, service, source } = setup();
    const stale = await service.listLive();
    cache.snapshot = { fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS), streams: stale };
    cache.refreshClaimable = false;
    const requestsBefore = source.requests.length;

    await expect(service.listLive()).resolves.toStrictEqual(stale);
    expect(source.requests).toHaveLength(requestsBefore);
  });

  it("falls back to the previous result when Twitch fails", async () => {
    const { cache, reportFailure, service, source } = setup();
    const stale = await service.listLive();
    cache.snapshot = { fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS), streams: stale };
    source.failure = new Error("Twitch down");

    await expect(service.listLive()).resolves.toStrictEqual(stale);
    expect(reportFailure).toHaveBeenCalledWith("fetch", expect.any(Error));
  });

  it("returns an empty list when Twitch fails without a previous result", async () => {
    const { service, source } = setup();
    source.failure = new Error("Twitch down");

    await expect(service.listLive()).resolves.toStrictEqual([]);
  });

  it("returns an empty list without calling Twitch when Redis is unavailable", async () => {
    const { cache, reportFailure, service, source } = setup();
    cache.readFailure = new Error("Redis down");

    await expect(service.listLive()).resolves.toStrictEqual([]);
    expect(source.requests).toStrictEqual([]);
    expect(reportFailure).toHaveBeenCalledWith("cache", expect.any(Error));
  });

  it("returns fetched streams when the cache write fails", async () => {
    const { cache, reportFailure, service } = setup();
    cache.writeFailure = new Error("Redis down");

    await expect(service.listLive()).resolves.toHaveLength(2);
    expect(reportFailure).toHaveBeenCalledWith("cache", expect.any(Error));
  });

  it("skips Twitch when no channel is tracked", async () => {
    const { service, source } = setup([]);

    await expect(service.listLive()).resolves.toStrictEqual([]);
    expect(source.requests).toStrictEqual([]);
  });

  it("adds a channel and refreshes the cached live list", async () => {
    const { service, source } = setup([]);
    await service.listLive();

    await expect(service.add("zenrll", "Zen")).resolves.toMatchObject({ login: "zenrll" });
    await service.listLive();

    expect(source.requests).toStrictEqual([["zenrll"]]);
  });

  it("rejects a channel that is already tracked", async () => {
    const { service } = setup([tracked("zenrll", "Zen")]);

    await expect(service.add("zenrll", null)).rejects.toBeInstanceOf(ConflictError);
  });

  it("removes a channel and refreshes the cached live list", async () => {
    const { service } = setup([tracked("zenrll", "Zen")]);
    await expect(service.listLive()).resolves.toHaveLength(2);

    await service.remove("zenrll-id");

    await expect(service.listLive()).resolves.toStrictEqual([]);
  });

  it("reports a missing channel on removal", async () => {
    const { service } = setup();

    await expect(service.remove("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
