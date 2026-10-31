import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { TournamentController } from "./tournament.controller";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { CachedTournamentPrizesRead } from "../cache/cached-tournament-prizes.read";
import { Tournament } from "../../domain/competition";
import { TournamentPrizeService } from "../../application/tournament-prize.service";

describe("TournamentController.findOne", () => {
  const redis = { get: vi.fn(), set: vi.fn() };
  const tournaments = { findById: vi.fn() };
  let controller: TournamentController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new TournamentController(
      {} as never,
      {} as never,
      {} as never,
      new CachedTournamentRead(tournaments, redis),
      {} as never,
      new TournamentPrizeService(
        { tournamentSource: vi.fn(), byTournament: vi.fn(), byTeam: vi.fn(), byPlayer: vi.fn() },
        { run: vi.fn() },
        { invalidateTournament: vi.fn() },
        { error: vi.fn() },
      ),
      new CachedTournamentPrizesRead({ findByTournamentId: vi.fn() }, redis),
    );
    redis.get.mockResolvedValue(null);
  });

  it("does not cache misses and returns 404", async () => {
    tournaments.findById.mockResolvedValue(null);
    await expect(controller.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("returns the tournament response through the read adapter", async () => {
    tournaments.findById.mockResolvedValue(
      Object.assign(new Tournament(), {
        id: "t1",
        slug: "playoffs",
        event: { id: "e1", slug: "rlcs-2026", name: "RLCS 2026" },
      }),
    );
    const result = await controller.findOne("t1");
    expect(result.tournament).toMatchObject({ id: "t1", matches: [], participants: [] });
  });
});
