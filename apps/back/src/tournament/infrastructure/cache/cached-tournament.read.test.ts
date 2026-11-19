import { beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "evlog";
import { Player } from "../../../roster/domain/player";
import { Team } from "../../../roster/domain/team";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { mapTournamentDetail } from "../http/tournament.mapper";
import { CachedTournamentRead } from "./cached-tournament.read";
import { memoryRedis } from "./memory-redis.test-utils";

const fixture = () => {
  const team = Object.assign(new Team(), { id: "team", name: "Team", slug: "team" });

  const player = Object.assign(new Player(), {
    birthday: new Date("2000-01-02"),
    id: "player",
    team,
  });

  const participant = Object.assign(new TournamentParticipant(), { players: [player], team });

  const match = Object.assign(new Match(), {
    beginAt: new Date("2026-01-01"),
    id: "match",
    officialStreams: [{ language: "en", main: true, url: "https://twitch.tv/rl" }],
    participants: [participant],
    publicId: 7250,
    winner: participant,
  });

  return Object.assign(new Tournament(), {
    event: { id: "e1", name: "RLCS 2026", slug: "rlcs-2026" },
    id: "t1",
    matches: [match],
    name: "RLCS",
    participants: [participant],
    slug: "playoffs",
    winner: participant,
  });
};

describe(CachedTournamentRead, () => {
  const warn = vi.spyOn(log, "warn");
  let redis = memoryRedis();
  let model: Tournament;
  let databaseFailure: Error | null = null;
  const stored = new Map<string, Tournament>();

  const tournaments = {
    findById: async (id: string) => {
      if (databaseFailure) {
        throw databaseFailure;
      }

      return stored.get(id) ?? null;
    },
  };

  const findById = vi.spyOn(tournaments, "findById");
  let read = new CachedTournamentRead(tournaments, redis);

  beforeEach(() => {
    warn.mockClear();
    findById.mockClear();
    redis = memoryRedis();
    read = new CachedTournamentRead(tournaments, redis);
    databaseFailure = null;
    model = fixture();
    stored.clear();
    stored.set("t1", model);
  });

  it("stores the public DTO with the established key and 60 second TTL", async () => {
    const result = await read.findById("t1");
    expect(result).toStrictEqual(mapTournamentDetail(model));
    expect(redis.writes).toStrictEqual([
      { key: "tournament:t1", ttl: 60, value: JSON.stringify(result) },
    ]);
    expect(JSON.stringify(result)).not.toContain("tournamentId");
  });

  it("returns identical JSON for a cache miss and hit including nested dates", async () => {
    const miss = await read.findById("t1");
    redis.entries.set("tournament:t1", JSON.stringify(miss));
    const hit = await read.findById("t1");
    expect(JSON.stringify(hit)).toStrictEqual(JSON.stringify(miss));
    expect(hit).toStrictEqual(miss);
    expect(findById).toHaveBeenCalledOnce();
    expect(redis.writes).toHaveLength(1);
  });

  it.each(["{broken", "null", "{}", '{"id":"t1"}', ""])(
    "treats malformed or incompatible cache data %p as a diagnosed miss",
    async (cached) => {
      redis.entries.set("tournament:t1", cached);
      await expect(read.findById("t1")).resolves.toStrictEqual(mapTournamentDetail(model));
      expect(warn).toHaveBeenCalledWith(expect.objectContaining({ key: "tournament:t1" }));
    },
  );

  it("rejects an invalid date and a DTO for a different key", async () => {
    const dto = mapTournamentDetail(model);
    redis.entries.set("tournament:t1", JSON.stringify({ ...dto, beginAt: "yesterday" }));
    await read.findById("t1");
    redis.entries.set("tournament:t1", JSON.stringify({ ...dto, id: "other" }));
    await read.findById("t1");
    expect(findById).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("never serves a cached value with fields outside the public response", async () => {
    const dto = mapTournamentDetail(model);
    redis.entries.set("tournament:t1", JSON.stringify({ ...dto, internalSecret: "hidden" }));
    await expect(read.findById("t1")).resolves.toStrictEqual(dto);
    expect(findById).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ key: "tournament:t1" }));
  });

  it.each([
    ["failReads", "read"],
    ["failWrites", "write"],
  ] as const)("preserves database success when cache %s fails", async (method, operation) => {
    redis[method](new Error("Redis unavailable"));
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
    stored.clear();
    await expect(read.findById("missing")).resolves.toBeNull();
    expect(redis.writes).toHaveLength(0);
  });

  it("propagates database failures without publishing a cache value", async () => {
    const failure = new Error("Database unavailable");
    databaseFailure = failure;
    await expect(read.findById("t1")).rejects.toBe(failure);
    expect(redis.writes).toHaveLength(0);
  });
});
