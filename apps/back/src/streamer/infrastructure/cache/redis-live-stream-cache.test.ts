import { beforeEach, describe, expect, it, vi } from "vitest";
import { StreamerService } from "../../application/streamer.service";
import { TOKEN_REQUEST_TIMEOUT_MS } from "../twitch/twitch-app-token";
import { STREAMS_REQUEST_TIMEOUT_MS } from "../twitch/twitch-helix-source";
import {
  LIVE_STREAMS_KEY,
  LIVE_STREAMS_LOCK_KEY,
  LOCK_TTL_SECONDS,
  RedisLiveStreamCache,
  SNAPSHOT_TTL_SECONDS,
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
    setIfAbsent: vi.fn(async (key: string, value: string, _ttl: number) => {
      if (store.has(key)) return false;
      store.set(key, value);
      return true;
    }),
    setWhileHeld: vi.fn(
      async (lockKey: string, lockValue: string, key: string, value: string, _ttl: number) => {
        if (store.get(lockKey) !== lockValue) return false;
        store.set(key, value);
        return true;
      },
    ),
    delete: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  });
  let redis = createRedis();
  let cache = new RedisLiveStreamCache(redis);

  beforeEach(() => {
    store = new Map();
    redis = createRedis();
    cache = new RedisLiveStreamCache(redis);
  });

  it("round-trips a snapshot written under the refresh claim", async () => {
    const fetchedAt = new Date("2026-10-31T20:00:00Z");
    const claim = await cache.claimRefresh();
    if (claim === null) throw new Error("expected a refresh claim");

    await expect(cache.write({ streams: [stream], fetchedAt }, claim)).resolves.toBe(true);

    await expect(cache.read()).resolves.toEqual({ streams: [stream], fetchedAt });
    expect(redis.setWhileHeld).toHaveBeenCalledWith(
      LIVE_STREAMS_LOCK_KEY,
      claim,
      LIVE_STREAMS_KEY,
      expect.any(String),
      SNAPSHOT_TTL_SECONDS,
    );
  });

  it("keeps a stale fallback for at most ten minutes", () => {
    expect(SNAPSHOT_TTL_SECONDS).toBeLessThanOrEqual(10 * 60);
  });

  it("ignores an invalid cached value", async () => {
    store.set(LIVE_STREAMS_KEY, JSON.stringify({ streams: "nope" }));

    await expect(cache.read()).resolves.toBeNull();
  });

  it.each(["{not json", "", "undefined"])(
    "ignores the corrupted cached value %j",
    async (value) => {
      store.set(LIVE_STREAMS_KEY, value);

      await expect(cache.read()).resolves.toBeNull();
    },
  );

  it("refreshes and rewrites the snapshot when the cached value is corrupted", async () => {
    const now = new Date("2026-10-31T20:00:00Z");
    store.set(LIVE_STREAMS_KEY, "{not json");
    const findLiveRocketLeague = vi
      .fn()
      .mockResolvedValue([
        { login: "zenrll", displayName: "Zen", title: "ranked", viewerCount: 900 },
      ]);
    const service = new StreamerService(
      {
        list: vi
          .fn()
          .mockResolvedValue([
            { id: "zenrll-id", login: "zenrll", displayName: "Zen", createdAt: now },
          ]),
        add: vi.fn(),
        remove: vi.fn(),
      },
      { findLiveRocketLeague },
      cache,
      vi.fn(),
      () => now,
    );

    await expect(service.listLive()).resolves.toEqual([stream]);
    expect(findLiveRocketLeague).toHaveBeenCalledTimes(1);
    await expect(cache.read()).resolves.toEqual({ streams: [stream], fetchedAt: now });
  });

  it("lets a single caller claim the refresh", async () => {
    await expect(cache.claimRefresh()).resolves.toEqual(expect.any(String));
    await expect(cache.claimRefresh()).resolves.toBeNull();
    expect(redis.setIfAbsent).toHaveBeenCalledWith(
      LIVE_STREAMS_LOCK_KEY,
      expect.any(String),
      LOCK_TTL_SECONDS,
    );
  });

  it("holds the refresh claim longer than a worst-case refresh", () => {
    const worstCaseRefreshMs = 2 * (TOKEN_REQUEST_TIMEOUT_MS + STREAMS_REQUEST_TIMEOUT_MS);
    expect(LOCK_TTL_SECONDS * 1000).toBeGreaterThan(worstCaseRefreshMs);
  });

  it("drops a refresh that lost its claim to an invalidation", async () => {
    const staleClaim = await cache.claimRefresh();
    if (staleClaim === null) throw new Error("expected a refresh claim");

    await cache.clear();
    const freshClaim = await cache.claimRefresh();

    await expect(
      cache.write({ streams: [stream], fetchedAt: new Date() }, staleClaim),
    ).resolves.toBe(false);
    expect(freshClaim).not.toBe(staleClaim);
    await expect(cache.read()).resolves.toBeNull();
  });

  it("clears the snapshot and the refresh claim", async () => {
    const claim = await cache.claimRefresh();
    if (claim === null) throw new Error("expected a refresh claim");
    await cache.write({ streams: [stream], fetchedAt: new Date() }, claim);

    await cache.clear();

    await expect(cache.read()).resolves.toBeNull();
    await expect(cache.claimRefresh()).resolves.toEqual(expect.any(String));
  });
});
