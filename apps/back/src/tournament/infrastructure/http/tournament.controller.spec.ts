import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { TournamentController } from "./tournament.controller";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { Tournament } from "../../domain/competition";

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
    );
    redis.get.mockResolvedValue(null);
  });

  it("does not cache misses and returns 404", async () => {
    tournaments.findById.mockResolvedValue(null);
    await expect(controller.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("returns the tournament response through the read adapter", async () => {
    tournaments.findById.mockResolvedValue(Object.assign(new Tournament(), { id: "t1" }));
    const result = await controller.findOne("t1");
    expect(result.tournament).toMatchObject({ id: "t1", matches: [], participants: [] });
  });
});
