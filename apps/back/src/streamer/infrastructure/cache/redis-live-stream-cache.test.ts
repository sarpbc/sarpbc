import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_STREAMS_KEY,
  LIVE_STREAMS_LOCK_KEY,
  RedisLiveStreamCache,
} from "./redis-live-stream-cache";

const stream = {
  login: "zenrll",
  displayName: "Zen",
  title: "ranked",
  viewerCount: 900,
  url: "https://twitch.tv/zenrll",
};

describe("RedisLiveStreamCache", () => {
  let store = new Map<string, string>();
  const createRedis = () => ({
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    setIfAbsent: vi.fn(async (key: string, value: string) => {
      if (store.has(key)) return false;
      store.set(key, value);
      return true;
    }),
    delete: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  });
  let redis = createRedis();
  let cache = new RedisLiveStreamCache(redis);

  beforeEach(() => {
    store = new Map();
    redis = createRedis();
    cache = new RedisLiveStreamCache(redis);
  });

  it("round-trips a snapshot", async () => {
    const fetchedAt = new Date("2026-10-31T20:00:00Z");
    await cache.write({ streams: [stream], fetchedAt });

    await expect(cache.read()).resolves.toEqual({ streams: [stream], fetchedAt });
    expect(redis.set).toHaveBeenCalledWith(LIVE_STREAMS_KEY, expect.any(String), 3600);
  });

  it("ignores an invalid cached value", async () => {
    store.set(LIVE_STREAMS_KEY, JSON.stringify({ streams: "nope" }));

    await expect(cache.read()).resolves.toBeNull();
  });

  it("lets a single caller claim the refresh", async () => {
    await expect(cache.claimRefresh()).resolves.toBe(true);
    await expect(cache.claimRefresh()).resolves.toBe(false);
    expect(redis.setIfAbsent).toHaveBeenCalledWith(LIVE_STREAMS_LOCK_KEY, "1", 15);
  });

  it("clears the snapshot and the refresh claim", async () => {
    await cache.write({ streams: [stream], fetchedAt: new Date() });
    await cache.claimRefresh();

    await cache.clear();

    await expect(cache.read()).resolves.toBeNull();
    await expect(cache.claimRefresh()).resolves.toBe(true);
  });
});
