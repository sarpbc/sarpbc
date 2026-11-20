import { describe, expect, it } from "vitest";
import type { StatsEra, StatsGrouping, TournamentPlayerStatsResponse } from "@sarpbc/types";
import { memoryRedis } from "../../../tournament/infrastructure/cache/memory-redis.test-utils";
import { CachedOverallPlayerStatsRead } from "./cached-overall-player-stats.read";

const stats: TournamentPlayerStatsResponse = {
  games: 12,
  players: [
    {
      games: 12,
      goalParticipation: 50,
      perGame: { assists: 0.5, demolitions: 1, goals: 1, saves: 2, shots: 3 },
      player: { id: "zen", name: "zen", slug: "zen" },
      shootingPercentage: 33.3,
      teams: [{ id: "team-vit", name: "Vitality", slug: "vitality" }],
      totals: { assists: 6, demolitions: 12, goals: 12, saves: 24, shots: 36 },
    },
  ],
  unlinkedAccounts: 1,
};

const countingStats = (results: (() => Promise<TournamentPlayerStatsResponse>)[] = []) => {
  const requests: [StatsEra | null, StatsGrouping][] = [];

  const source = {
    calls: 0,
    overall: async (era: StatsEra | null, by: StatsGrouping) => {
      source.calls += 1;
      source.requests.push([era, by]);

      return await (results.shift() ?? (async () => stats))();
    },
    requests,
  };

  return source;
};

describe(CachedOverallPlayerStatsRead, () => {
  it("computes the leaderboard once for concurrent requests and serves it from Redis after", async () => {
    const source = countingStats();
    const redis = memoryRedis();
    const read = new CachedOverallPlayerStatsRead(source, redis);

    await Promise.all(Array.from({ length: 50 }, async () => await read.overall(null, "player")));
    await expect(read.overall(null, "player")).resolves.toStrictEqual(stats);

    expect(source.calls).toBe(1);
    expect(redis.writes).toStrictEqual([
      { key: "player-stats:overall:all:player", ttl: 60, value: JSON.stringify(stats) },
    ]);
  });

  it("caches each era and grouping under its own key", async () => {
    const source = countingStats();
    const redis = memoryRedis();
    const read = new CachedOverallPlayerStatsRead(source, redis);

    await Promise.all([
      read.overall("open", "player"),
      read.overall("pre-open", "player"),
      read.overall(null, "player"),
      read.overall(null, "team"),
    ]);

    expect(source.requests).toStrictEqual([
      ["open", "player"],
      ["pre-open", "player"],
      [null, "player"],
      [null, "team"],
    ]);
    expect(redis.writes.map(({ key }) => key)).toStrictEqual([
      "player-stats:overall:open:player",
      "player-stats:overall:pre-open:player",
      "player-stats:overall:all:player",
      "player-stats:overall:all:team",
    ]);
  });

  it("falls back to the database when Redis fails", async () => {
    const source = countingStats();
    const redis = memoryRedis();

    redis.failReads(new Error("down"));
    redis.failWrites(new Error("down"));

    const read = new CachedOverallPlayerStatsRead(source, redis);

    await expect(read.overall(null, "player")).resolves.toStrictEqual(stats);
    await expect(read.overall(null, "player")).resolves.toStrictEqual(stats);
    expect(source.calls).toBe(2);
  });

  it("recomputes when the cached value no longer matches the response shape", async () => {
    const source = countingStats();
    const redis = memoryRedis();

    redis.entries.set("player-stats:overall:all:player", JSON.stringify({ players: "stale" }));

    await expect(
      new CachedOverallPlayerStatsRead(source, redis).overall(null, "player"),
    ).resolves.toStrictEqual(stats);
    expect(source.calls).toBe(1);
  });

  it("lets the next request retry after a failed computation", async () => {
    const source = countingStats([async () => await Promise.reject(new Error("db down"))]);
    const read = new CachedOverallPlayerStatsRead(source, memoryRedis());

    await expect(read.overall(null, "player")).rejects.toThrow("db down");
    await expect(read.overall(null, "player")).resolves.toStrictEqual(stats);
  });
});
