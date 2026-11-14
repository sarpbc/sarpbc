import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { TrackedStreamer } from "../domain/tracked-streamer";
import type { LiveStreamCache, LiveStreamSnapshot } from "./ports/live-stream-cache";
import type { LiveStreamSource, SourceStream } from "./ports/live-stream-source";
import type { TrackedStreamerStore } from "./ports/tracked-streamer-store";
import { LIVE_STREAMS_FRESH_MS, StreamerService } from "./streamer.service";
import type { StreamerFailureReporter } from "./streamer.service";

const now = new Date("2026-10-31T20:00:00Z");

const tracked = (login: string, displayName: string | null = null): TrackedStreamer => ({
  createdAt: now,
  displayName,
  id: `${login}-id`,
  login,
});

const live = (login: string, viewerCount: number): SourceStream => ({
  displayName: login.toUpperCase(),
  login,
  title: `${login} ranked`,
  viewerCount,
});

const createStreamers = () => ({
  add: vi.fn<TrackedStreamerStore["add"]>(),
  list: vi
    .fn<TrackedStreamerStore["list"]>()
    .mockResolvedValue([tracked("zenrll", "Zen"), tracked("kaydop")]),
  remove: vi.fn<TrackedStreamerStore["remove"]>(),
});

const createSource = () => ({
  findLiveRocketLeague: vi
    .fn<LiveStreamSource["findLiveRocketLeague"]>()
    .mockResolvedValue([live("kaydop", 100), live("zenrll", 900)]),
});

describe(StreamerService, () => {
  let snapshot: LiveStreamSnapshot | null = null;

  const createCache = () => ({
    claimRefresh: vi.fn<LiveStreamCache["claimRefresh"]>().mockResolvedValue("claim-1"),
    clear: vi.fn<LiveStreamCache["clear"]>().mockResolvedValue(undefined),
    read: vi.fn<LiveStreamCache["read"]>(async () => snapshot),
    write: vi.fn<LiveStreamCache["write"]>(async (value) => {
      snapshot = value;

      return true;
    }),
  });

  let streamers = createStreamers();
  let source = createSource();
  let cache = createCache();
  let reportFailure = vi.fn<StreamerFailureReporter>();
  let service = new StreamerService(streamers, source, cache, reportFailure, () => now);

  beforeEach(() => {
    streamers = createStreamers();
    source = createSource();
    snapshot = null;
    cache = createCache();
    reportFailure = vi.fn<StreamerFailureReporter>();
    service = new StreamerService(streamers, source, cache, reportFailure, () => now);
  });

  it("returns an empty list without touching the cache or Twitch when the feature is off", async () => {
    service = new StreamerService(streamers, null, cache, reportFailure, () => now);

    await expect(service.listLive()).resolves.toStrictEqual([]);
    expect(cache.read).not.toHaveBeenCalled();
    expect(streamers.list).not.toHaveBeenCalled();
  });

  it("fetches tracked logins, applies display names, sorts by viewers and caches the result", async () => {
    const result = await service.listLive();

    expect(source.findLiveRocketLeague).toHaveBeenCalledWith(["zenrll", "kaydop"]);
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
    expect(cache.write).toHaveBeenCalledWith({ fetchedAt: now, streams: result }, "claim-1");
  });

  it("serves a fresh cached result without calling Twitch", async () => {
    snapshot = { fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS + 1), streams: [] };

    await expect(service.listLive()).resolves.toStrictEqual([]);
    expect(source.findLiveRocketLeague).not.toHaveBeenCalled();
    expect(cache.claimRefresh).not.toHaveBeenCalled();
  });

  it("calls Twitch once for successive visitors within the cache window", async () => {
    await service.listLive();
    await service.listLive();
    await service.listLive();

    expect(source.findLiveRocketLeague).toHaveBeenCalledOnce();
  });

  it("serves the stale result while another instance refreshes", async () => {
    const stale = await service.listLive();
    snapshot = { fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS), streams: stale };
    cache.claimRefresh.mockResolvedValue(null);
    source.findLiveRocketLeague.mockClear();

    await expect(service.listLive()).resolves.toStrictEqual(stale);
    expect(source.findLiveRocketLeague).not.toHaveBeenCalled();
  });

  it("falls back to the previous result when Twitch fails", async () => {
    const stale = await service.listLive();
    snapshot = { fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS), streams: stale };
    source.findLiveRocketLeague.mockRejectedValue(new Error("Twitch down"));

    await expect(service.listLive()).resolves.toStrictEqual(stale);
    expect(reportFailure).toHaveBeenCalledWith("fetch", expect.any(Error));
  });

  it("returns an empty list when Twitch fails without a previous result", async () => {
    source.findLiveRocketLeague.mockRejectedValue(new Error("Twitch down"));

    await expect(service.listLive()).resolves.toStrictEqual([]);
  });

  it("returns an empty list without calling Twitch when Redis is unavailable", async () => {
    cache.read.mockRejectedValue(new Error("Redis down"));

    await expect(service.listLive()).resolves.toStrictEqual([]);
    expect(source.findLiveRocketLeague).not.toHaveBeenCalled();
    expect(reportFailure).toHaveBeenCalledWith("cache", expect.any(Error));
  });

  it("returns fetched streams when the cache write fails", async () => {
    cache.write.mockRejectedValue(new Error("Redis down"));

    await expect(service.listLive()).resolves.toHaveLength(2);
    expect(reportFailure).toHaveBeenCalledWith("cache", expect.any(Error));
  });

  it("skips Twitch when no channel is tracked", async () => {
    streamers.list.mockResolvedValue([]);

    await expect(service.listLive()).resolves.toStrictEqual([]);
    expect(source.findLiveRocketLeague).not.toHaveBeenCalled();
  });

  it("adds a channel and invalidates the cache", async () => {
    streamers.add.mockResolvedValue(tracked("zenrll", "Zen"));

    await expect(service.add("zenrll", "Zen")).resolves.toMatchObject({ login: "zenrll" });
    expect(streamers.add).toHaveBeenCalledWith("zenrll", "Zen");
    expect(cache.clear).toHaveBeenCalledExactlyOnceWith();
  });

  it("rejects a channel that is already tracked", async () => {
    streamers.add.mockResolvedValue(null);

    await expect(service.add("zenrll", null)).rejects.toBeInstanceOf(ConflictError);
    expect(cache.clear).not.toHaveBeenCalled();
  });

  it("removes a channel and invalidates the cache", async () => {
    streamers.remove.mockResolvedValue(true);

    await service.remove("zenrll-id");
    expect(cache.clear).toHaveBeenCalledExactlyOnceWith();
  });

  it("reports a missing channel on removal", async () => {
    streamers.remove.mockResolvedValue(false);

    await expect(service.remove("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
