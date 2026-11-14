import { beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "evlog";
import { Player } from "../../../roster/domain/player";
import { Team } from "../../../roster/domain/team";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentQueries } from "../../application/ports";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { mapTournamentDetail } from "../http/tournament.mapper";
import { CachedTournamentRead } from "./cached-tournament.read";

const fixture = (): Tournament => {
  const team = Object.assign(new Team(), { id: "team", name: "Team", slug: "team" });

  const player = Object.assign(new Player(), {
    id: "player",
    team,
    birthday: new Date("2000-01-02"),
  });

  const participant = Object.assign(new TournamentParticipant(), { team, players: [player] });

  const match = Object.assign(new Match(), {
    id: "match",
    publicId: 7250,
    participants: [participant],
    winner: participant,
    beginAt: new Date("2026-01-01"),
    officialStreams: [{ url: "https://twitch.tv/rl", language: "en", main: true }],
  });

  return Object.assign(new Tournament(), {
    id: "t1",
    name: "RLCS",
    slug: "playoffs",
    event: { id: "e1", slug: "rlcs-2026", name: "RLCS 2026" },
    participants: [participant],
    matches: [match],
    winner: participant,
  });
};

describe(CachedTournamentRead, () => {
  const warn = vi.spyOn(log, "warn");

  const redis = {
    get: vi.fn<RedisService["get"]>(),
    set: vi.fn<RedisService["set"]>(),
  };

  const tournaments = { findById: vi.fn<TournamentQueries["findById"]>() };
  const read = new CachedTournamentRead(tournaments, redis);
  let model: Tournament;

  beforeEach(() => {
    vi.resetAllMocks();
    model = fixture();
    tournaments.findById.mockResolvedValue(model);
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
  });

  it("stores the public DTO with the established key and 60 second TTL", async () => {
    const result = await read.findById("t1");
    expect(result).toStrictEqual(mapTournamentDetail(model));
    expect(redis.set).toHaveBeenCalledWith("tournament:t1", JSON.stringify(result), 60);
    expect(JSON.stringify(result)).not.toContain("tournamentId");
  });

  it("returns identical JSON for a cache miss and hit including nested dates", async () => {
    const miss = await read.findById("t1");
    redis.get.mockResolvedValue(JSON.stringify(miss));
    const hit = await read.findById("t1");
    expect(JSON.stringify(hit)).toStrictEqual(JSON.stringify(miss));
    expect(hit).toStrictEqual(miss);
    expect(tournaments.findById).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenCalledOnce();
  });

  it.each(["{broken", "null", "{}", '{"id":"t1"}', ""])(
    "treats malformed or incompatible cache data %p as a diagnosed miss",
    async (cached) => {
      redis.get.mockResolvedValue(cached);
      await expect(read.findById("t1")).resolves.toStrictEqual(mapTournamentDetail(model));
      expect(warn).toHaveBeenCalledWith(expect.objectContaining({ key: "tournament:t1" }));
    },
  );

  it("rejects an invalid date and a DTO for a different key", async () => {
    const dto = mapTournamentDetail(model);
    redis.get.mockResolvedValue(JSON.stringify({ ...dto, beginAt: "yesterday" }));
    await read.findById("t1");
    redis.get.mockResolvedValue(JSON.stringify({ ...dto, id: "other" }));
    await read.findById("t1");
    expect(tournaments.findById).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("never serves a cached value with fields outside the public response", async () => {
    const dto = mapTournamentDetail(model);
    redis.get.mockResolvedValue(JSON.stringify({ ...dto, internalSecret: "hidden" }));
    await expect(read.findById("t1")).resolves.toStrictEqual(dto);
    expect(tournaments.findById).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ key: "tournament:t1" }));
  });

  it.each([
    ["get", "read"],
    ["set", "write"],
  ] as const)("preserves database success when cache %s fails", async (method, operation) => {
    redis[method].mockRejectedValue(new Error("Redis unavailable"));
    await expect(read.findById("t1")).resolves.toStrictEqual(mapTournamentDetail(model));
    expect(warn).toHaveBeenCalledExactlyOnceWith({
      component: "CachedTournamentRead",
      error: new Error("Redis unavailable"),
      key: "tournament:t1",
      message: "Optional tournament cache failed",
      operation,
    });
  });

  it("does not cache missing records", async () => {
    tournaments.findById.mockResolvedValue(null);
    await expect(read.findById("missing")).resolves.toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("propagates database failures without publishing a cache value", async () => {
    const failure = new Error("Database unavailable");
    tournaments.findById.mockRejectedValue(failure);
    await expect(read.findById("t1")).rejects.toBe(failure);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
