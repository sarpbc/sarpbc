import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TournamentPrizes } from "@sarpbc/types";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { CachedTournamentPrizesRead } from "./cached-tournament-prizes.read";
import { memoryRedis } from "./memory-redis.test-utils";

const distribution: TournamentPrizes = {
  prizepool: "10000 United States Dollar",
  prizes: [
    {
      amount: 5000,
      currency: "USD",
      id: "prize-1",
      placement: 1,
      players: [{ id: "player-a", name: "Player A", slug: "player-a" }],
      sourceUrl: "https://www.rocketleague.com/en/news/rlcs-rules",
      team: {
        darkModeImageUrl: null,
        id: "team-a",
        imageUrl: null,
        name: "Team A",
        slug: "team-a",
      },
    },
  ],
  source: "manual",
};

describe(CachedTournamentPrizesRead, () => {
  let redis = memoryRedis();
  let failure: Error | null = null;

  const prizes = {
    findByTournamentId: async () => {
      if (failure) {
        throw failure;
      }

      return distribution;
    },
  };

  const findByTournamentId = vi.spyOn(prizes, "findByTournamentId");
  let read = new CachedTournamentPrizesRead(prizes, redis);

  beforeEach(() => {
    findByTournamentId.mockClear();
    redis = memoryRedis();
    read = new CachedTournamentPrizesRead(prizes, redis);
    failure = null;
  });

  it("stores the distribution for 60 seconds on a miss", async () => {
    await expect(read.findByTournamentId("cup")).resolves.toStrictEqual(distribution);
    expect(redis.writes).toStrictEqual([
      { key: "tournament-prizes:cup", ttl: 60, value: JSON.stringify(distribution) },
    ]);
  });

  it("serves a cached distribution without reading the database", async () => {
    redis.entries.set("tournament-prizes:cup", JSON.stringify(distribution));
    await expect(read.findByTournamentId("cup")).resolves.toStrictEqual(distribution);
    expect(findByTournamentId).not.toHaveBeenCalled();
  });

  it("ignores an undecodable cache entry and an unavailable cache", async () => {
    redis.entries.set("tournament-prizes:cup", JSON.stringify({ prizes: "broken" }));
    await expect(read.findByTournamentId("cup")).resolves.toStrictEqual(distribution);

    redis.failReads(new Error("down"));
    redis.failWrites(new Error("down"));
    await expect(read.findByTournamentId("cup")).resolves.toStrictEqual(distribution);
  });

  it("does not cache unknown tournaments", async () => {
    failure = new NotFoundError("missing");
    await expect(read.findByTournamentId("missing")).rejects.toThrow(NotFoundError);
    expect(redis.writes).toHaveLength(0);
  });
});
