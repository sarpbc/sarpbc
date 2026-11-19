import { beforeEach, describe, expect, it, vi } from "vitest";
import { StreamerService } from "../../application/streamer.service";
import type { StreamerFailureReporter } from "../../application/streamer.service";
import { TOKEN_REQUEST_TIMEOUT_MS } from "../twitch/twitch-app-token";
import { STREAMS_REQUEST_TIMEOUT_MS } from "../twitch/twitch-helix-source";
import { MemoryRedis } from "../../../infrastructure/redis/memory-redis.test-utils";
import { MemoryLiveStreamSource } from "../../application/ports/live-stream-source.test-utils";
import { MemoryTrackedStreamerStore } from "../../application/ports/tracked-streamer-store.test-utils";
import {
  LIVE_STREAMS_KEY,
  LIVE_STREAMS_LOCK_KEY,
  LOCK_TTL_SECONDS,
  RedisLiveStreamCache,
  SNAPSHOT_TTL_SECONDS,
} from "./redis-live-stream-cache";

const stream = {
  displayName: "Zen",
  login: "zenrll",
  title: "ranked",
  url: "https://twitch.tv/zenrll",
  viewerCount: 900,
};

describe(RedisLiveStreamCache, () => {
  let redis = new MemoryRedis();
  let cache = new RedisLiveStreamCache(redis);

  beforeEach(() => {
    redis = new MemoryRedis();
    cache = new RedisLiveStreamCache(redis);
  });

  it("round-trips a snapshot written under the refresh claim", async () => {
    const fetchedAt = new Date("2026-10-31T20:00:00Z");
    const claim = await cache.claimRefresh();

    if (claim === null) {
      throw new Error("expected a refresh claim");
    }

    await expect(cache.write({ fetchedAt, streams: [stream] }, claim)).resolves.toBe(true);

    await expect(cache.read()).resolves.toStrictEqual({ fetchedAt, streams: [stream] });
    expect(redis.ttls.get(LIVE_STREAMS_KEY)).toBe(SNAPSHOT_TTL_SECONDS);
  });

  it("ignores an invalid cached value", async () => {
    redis.values.set(LIVE_STREAMS_KEY, JSON.stringify({ streams: "nope" }));

    await expect(cache.read()).resolves.toBeNull();
  });

  it.each(["{not json", "", "undefined"])(
    "ignores the corrupted cached value %j",
    async (value) => {
      redis.values.set(LIVE_STREAMS_KEY, value);

      await expect(cache.read()).resolves.toBeNull();
    },
  );

  it("refreshes and rewrites the snapshot when the cached value is corrupted", async () => {
    const now = new Date("2026-10-31T20:00:00Z");
    redis.values.set(LIVE_STREAMS_KEY, "{not json");

    const source = new MemoryLiveStreamSource([
      { displayName: "Zen", login: "zenrll", title: "ranked", viewerCount: 900 },
    ]);

    const service = new StreamerService(
      new MemoryTrackedStreamerStore([
        { createdAt: now, displayName: "Zen", id: "zenrll-id", login: "zenrll" },
      ]),
      source,
      cache,
      vi.fn<StreamerFailureReporter>(),
      () => now,
    );

    await expect(service.listLive()).resolves.toStrictEqual([stream]);
    expect(source.requests).toHaveLength(1);
    await expect(cache.read()).resolves.toStrictEqual({ fetchedAt: now, streams: [stream] });
  });

  it("lets a single caller claim the refresh", async () => {
    await expect(cache.claimRefresh()).resolves.toStrictEqual(expect.any(String));
    await expect(cache.claimRefresh()).resolves.toBeNull();
    expect(redis.ttls.get(LIVE_STREAMS_LOCK_KEY)).toBe(LOCK_TTL_SECONDS);
  });

  it("holds the refresh claim longer than a worst-case refresh", () => {
    const worstCaseRefreshMs = 2 * (TOKEN_REQUEST_TIMEOUT_MS + STREAMS_REQUEST_TIMEOUT_MS);
    expect(LOCK_TTL_SECONDS * 1000).toBeGreaterThan(worstCaseRefreshMs);
  });

  it("drops a refresh that lost its claim to an invalidation", async () => {
    const staleClaim = await cache.claimRefresh();

    if (staleClaim === null) {
      throw new Error("expected a refresh claim");
    }

    await cache.clear();
    const freshClaim = await cache.claimRefresh();

    await expect(
      cache.write({ fetchedAt: new Date(), streams: [stream] }, staleClaim),
    ).resolves.toBe(false);
    expect(freshClaim).not.toBe(staleClaim);
    await expect(cache.read()).resolves.toBeNull();
  });

  it("clears the snapshot and the refresh claim", async () => {
    const claim = await cache.claimRefresh();

    if (claim === null) {
      throw new Error("expected a refresh claim");
    }

    await cache.write({ fetchedAt: new Date(), streams: [stream] }, claim);

    await cache.clear();

    await expect(cache.read()).resolves.toBeNull();
    await expect(cache.claimRefresh()).resolves.toStrictEqual(expect.any(String));
  });
});
