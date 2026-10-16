import { NotFoundException } from "@nestjs/common";
import { TournamentController } from "./tournament.controller";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { Tournament } from "../../domain/competition";

describe("TournamentController.findOne", () => {
  const redis = { get: jest.fn(), set: jest.fn() };
  const tournaments = { findById: jest.fn() };
  let controller: TournamentController;

  beforeEach(() => {
    jest.resetAllMocks();
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
