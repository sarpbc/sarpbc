import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TournamentPrizes } from "@sarpbc/types";
import { NotFoundError } from "../../../common/domain/errors";
import { CachedTournamentPrizesRead } from "./cached-tournament-prizes.read";

const distribution: TournamentPrizes = {
  source: "manual",
  prizepool: "10000 United States Dollar",
  prizes: [
    {
      id: "prize-1",
      placement: 1,
      amount: 5000,
      currency: "USD",
      team: {
        id: "team-a",
        name: "Team A",
        slug: "team-a",
        imageUrl: null,
        darkModeImageUrl: null,
      },
      players: [{ id: "player-a", name: "Player A", slug: "player-a" }],
    },
  ],
};

describe("CachedTournamentPrizesRead", () => {
  const redis = { get: vi.fn(), set: vi.fn() };
  const prizes = { findByTournamentId: vi.fn() };
  const read = new CachedTournamentPrizesRead(prizes, redis);

  beforeEach(() => {
    vi.resetAllMocks();
    redis.get.mockResolvedValue(null);
    prizes.findByTournamentId.mockResolvedValue(distribution);
  });

  it("stores the distribution for 60 seconds on a miss", async () => {
    expect(await read.findByTournamentId("cup")).toEqual(distribution);
    expect(redis.set).toHaveBeenCalledWith(
      "tournament-prizes:cup",
      JSON.stringify(distribution),
      60,
    );
  });

  it("serves a cached distribution without reading the database", async () => {
    redis.get.mockResolvedValue(JSON.stringify(distribution));
    expect(await read.findByTournamentId("cup")).toEqual(distribution);
    expect(prizes.findByTournamentId).not.toHaveBeenCalled();
  });

  it("ignores an undecodable cache entry and an unavailable cache", async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify({ prizes: "broken" }));
    expect(await read.findByTournamentId("cup")).toEqual(distribution);

    redis.get.mockRejectedValueOnce(new Error("down"));
    redis.set.mockRejectedValueOnce(new Error("down"));
    expect(await read.findByTournamentId("cup")).toEqual(distribution);
  });

  it("does not cache unknown tournaments", async () => {
    prizes.findByTournamentId.mockRejectedValue(new NotFoundError("missing"));
    await expect(read.findByTournamentId("missing")).rejects.toThrow(NotFoundError);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
