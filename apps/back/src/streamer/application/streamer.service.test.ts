import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../common/domain/errors";
import type { TrackedStreamer } from "../domain/tracked-streamer";
import type { LiveStreamSnapshot } from "./ports/live-stream-cache";
import type { SourceStream } from "./ports/live-stream-source";
import { LIVE_STREAMS_FRESH_MS, StreamerService } from "./streamer.service";

const now = new Date("2026-10-31T20:00:00Z");

function tracked(login: string, displayName: string | null = null): TrackedStreamer {
  return { id: `${login}-id`, login, displayName, createdAt: now };
}

function live(login: string, viewerCount: number): SourceStream {
  return {
    login,
    displayName: login.toUpperCase(),
    title: `${login} ranked`,
    viewerCount,
  };
}

describe("StreamerService", () => {
  let snapshot: LiveStreamSnapshot | null = null;
  const createStreamers = () => ({
    list: vi.fn().mockResolvedValue([tracked("zenrll", "Zen"), tracked("kaydop")]),
    add: vi.fn(),
    remove: vi.fn(),
  });
  const createSource = () => ({
    findLiveRocketLeague: vi.fn().mockResolvedValue([live("kaydop", 100), live("zenrll", 900)]),
  });
  const createCache = () => ({
    read: vi.fn(async () => snapshot),
    write: vi.fn(async (value: LiveStreamSnapshot) => {
      snapshot = value;
    }),
    claimRefresh: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
  });
  let streamers = createStreamers();
  let source = createSource();
  let cache = createCache();
  let reportFailure = vi.fn();
  let service = new StreamerService(streamers, source, cache, reportFailure, () => now);

  beforeEach(() => {
    streamers = createStreamers();
    source = createSource();
    snapshot = null;
    cache = createCache();
    reportFailure = vi.fn();
    service = new StreamerService(streamers, source, cache, reportFailure, () => now);
  });

  it("returns an empty list without touching the cache or Twitch when the feature is off", async () => {
    service = new StreamerService(streamers, null, cache, reportFailure, () => now);

    await expect(service.listLive()).resolves.toEqual([]);
    expect(cache.read).not.toHaveBeenCalled();
    expect(streamers.list).not.toHaveBeenCalled();
  });

  it("fetches tracked logins, applies display names, sorts by viewers and caches the result", async () => {
    const result = await service.listLive();

    expect(source.findLiveRocketLeague).toHaveBeenCalledWith(["zenrll", "kaydop"]);
    expect(result).toEqual([
      {
        login: "zenrll",
        displayName: "Zen",
        title: "zenrll ranked",
        viewerCount: 900,
        url: "https://twitch.tv/zenrll",
      },
      {
        login: "kaydop",
        displayName: "KAYDOP",
        title: "kaydop ranked",
        viewerCount: 100,
        url: "https://twitch.tv/kaydop",
      },
    ]);
    expect(cache.write).toHaveBeenCalledWith({ streams: result, fetchedAt: now });
  });

  it("serves a fresh cached result without calling Twitch", async () => {
    snapshot = { streams: [], fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS + 1) };

    await expect(service.listLive()).resolves.toEqual([]);
    expect(source.findLiveRocketLeague).not.toHaveBeenCalled();
    expect(cache.claimRefresh).not.toHaveBeenCalled();
  });

  it("calls Twitch once for successive visitors within the cache window", async () => {
    await service.listLive();
    await service.listLive();
    await service.listLive();

    expect(source.findLiveRocketLeague).toHaveBeenCalledTimes(1);
  });

  it("serves the stale result while another instance refreshes", async () => {
    const stale = await service.listLive();
    snapshot = { streams: stale, fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS) };
    cache.claimRefresh.mockResolvedValue(false);
    source.findLiveRocketLeague.mockClear();

    await expect(service.listLive()).resolves.toEqual(stale);
    expect(source.findLiveRocketLeague).not.toHaveBeenCalled();
  });

  it("falls back to the previous result when Twitch fails", async () => {
    const stale = await service.listLive();
    snapshot = { streams: stale, fetchedAt: new Date(now.getTime() - LIVE_STREAMS_FRESH_MS) };
    source.findLiveRocketLeague.mockRejectedValue(new Error("Twitch down"));

    await expect(service.listLive()).resolves.toEqual(stale);
    expect(reportFailure).toHaveBeenCalledWith("fetch", expect.any(Error));
  });

  it("returns an empty list when Twitch fails without a previous result", async () => {
    source.findLiveRocketLeague.mockRejectedValue(new Error("Twitch down"));

    await expect(service.listLive()).resolves.toEqual([]);
  });

  it("returns an empty list without calling Twitch when Redis is unavailable", async () => {
    cache.read.mockRejectedValue(new Error("Redis down"));

    await expect(service.listLive()).resolves.toEqual([]);
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

    await expect(service.listLive()).resolves.toEqual([]);
    expect(source.findLiveRocketLeague).not.toHaveBeenCalled();
  });

  it("adds a channel and invalidates the cache", async () => {
    streamers.add.mockResolvedValue(tracked("zenrll", "Zen"));

    await expect(service.add("zenrll", "Zen")).resolves.toMatchObject({ login: "zenrll" });
    expect(streamers.add).toHaveBeenCalledWith("zenrll", "Zen");
    expect(cache.clear).toHaveBeenCalled();
  });

  it("rejects a channel that is already tracked", async () => {
    streamers.add.mockResolvedValue(null);

    await expect(service.add("zenrll", null)).rejects.toBeInstanceOf(ConflictError);
    expect(cache.clear).not.toHaveBeenCalled();
  });

  it("removes a channel and invalidates the cache", async () => {
    streamers.remove.mockResolvedValue(true);

    await service.remove("zenrll-id");
    expect(cache.clear).toHaveBeenCalled();
  });

  it("reports a missing channel on removal", async () => {
    streamers.remove.mockResolvedValue(false);

    await expect(service.remove("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
