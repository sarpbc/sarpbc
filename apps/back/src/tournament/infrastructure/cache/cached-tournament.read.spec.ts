import { beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "evlog";
import { Player, Team } from "../../../player/domain/roster";
import { Match, Tournament, TournamentParticipant } from "../../domain/competition";
import { mapTournament } from "../http/tournament.mapper";
import { CachedTournamentRead } from "./cached-tournament.read";

function fixture(): Tournament {
  const team = Object.assign(new Team(), { id: "team", name: "Team", slug: "team" });
  const player = Object.assign(new Player(), {
    id: "player",
    team,
    birthday: new Date("2000-01-02"),
  });
  const participant = Object.assign(new TournamentParticipant(), { team, players: [player] });
  const match = Object.assign(new Match(), {
    id: "match",
    participants: [participant],
    winner: participant,
    beginAt: new Date("2026-01-01"),
    officialStreams: [{ url: "https://twitch.tv/rl", language: "en", main: true }],
  });
  return Object.assign(new Tournament(), {
    id: "t1",
    name: "RLCS",
    participants: [participant],
    matches: [match],
    winner: participant,
  });
}

describe("CachedTournamentRead", () => {
  const redis = { get: vi.fn(), set: vi.fn() };
  const tournaments = { findById: vi.fn() };
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
    expect(result).toEqual(mapTournament(model, { includeMatches: true }));
    expect(redis.set).toHaveBeenCalledWith("tournament:t1", JSON.stringify(result), 60);
    expect(JSON.stringify(result)).not.toContain("tournamentId");
  });

  it("returns identical JSON for a cache miss and hit including nested dates", async () => {
    const miss = await read.findById("t1");
    redis.get.mockResolvedValue(JSON.stringify(miss));
    const hit = await read.findById("t1");
    expect(JSON.stringify(hit)).toEqual(JSON.stringify(miss));
    expect(hit).toEqual(miss);
    expect(tournaments.findById).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  it.each(["{broken", "null", "{}", '{"id":"t1"}', ""])(
    "treats malformed or incompatible cache data %p as a diagnosed miss",
    async (cached) => {
      redis.get.mockResolvedValue(cached);
      expect(await read.findById("t1")).toEqual(mapTournament(model, { includeMatches: true }));
      expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ key: "tournament:t1" }));
    },
  );

  it("rejects an invalid date and a DTO for a different key", async () => {
    const dto = mapTournament(model, { includeMatches: true });
    redis.get.mockResolvedValue(JSON.stringify({ ...dto, createdAt: "yesterday" }));
    await read.findById("t1");
    redis.get.mockResolvedValue(JSON.stringify({ ...dto, id: "other" }));
    await read.findById("t1");
    expect(tournaments.findById).toHaveBeenCalledTimes(2);
    expect(log.warn).toHaveBeenCalledTimes(2);
  });

  it("strips cache fields outside the public response", async () => {
    const dto = mapTournament(model, { includeMatches: true });
    redis.get.mockResolvedValue(JSON.stringify({ ...dto, internalSecret: "hidden" }));
    expect(await read.findById("t1")).toEqual(dto);
    expect(tournaments.findById).not.toHaveBeenCalled();
  });

  it.each(["get", "set"] as const)(
    "preserves database success when cache %s fails",
    async (operation) => {
      redis[operation].mockRejectedValue(new Error("Redis unavailable"));
      expect(await read.findById("t1")).toEqual(mapTournament(model, { includeMatches: true }));
      expect(log.warn).toHaveBeenCalled();
    },
  );

  it("does not cache missing records", async () => {
    tournaments.findById.mockResolvedValue(null);
    expect(await read.findById("missing")).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("propagates database failures without publishing a cache value", async () => {
    const failure = new Error("Database unavailable");
    tournaments.findById.mockRejectedValue(failure);
    await expect(read.findById("t1")).rejects.toBe(failure);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
