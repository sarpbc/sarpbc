import { NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { TournamentController } from "./tournament.controller";
import { TournamentService } from "./tournament.service";
import { ManualTournamentService } from "./manual-tournament.service";
import { MatchService } from "./match/match.service";
import { PlayerAwardService } from "./player-award.service";
import { Tournament } from "./tournament.entities";

describe("TournamentController.findOne", () => {
  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const tournamentService = {
    findById: jest.fn(),
  };
  let controller: TournamentController;

  beforeEach(() => {
    controller = new TournamentController(
      tournamentService as unknown as TournamentService,
      {} as ManualTournamentService,
      {} as MatchService,
      redisService as unknown as RedisService,
      {} as PlayerAwardService,
    );
    jest.clearAllMocks();
  });

  it("does not cache misses and returns 404", async () => {
    redisService.get.mockResolvedValue(null);
    tournamentService.findById.mockResolvedValue(null);

    await expect(controller.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(redisService.set).not.toHaveBeenCalled();
  });

  it("caches the mapped DTO, not the entity", async () => {
    redisService.get.mockResolvedValue(null);
    const tournament = Object.assign(new Tournament(), {
      id: "t1",
      name: "RLCS",
      pandascoreId: 9,
      source: "pandascore",
      description: null,
      slug: "rlcs",
      serie: "2026",
      tier: "s",
      beginAt: null,
      endAt: null,
      winner: null,
      winnerType: null,
      type: null,
      prizepool: null,
      imageUrl: null,
      league: null,
      pickemsEnabled: false,
      hasBracket: false,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });
    tournamentService.findById.mockResolvedValue(tournament);

    const result = await controller.findOne("t1");

    expect(result.tournament.id).toBe("t1");
    expect(result.tournament.name).toBe("RLCS");
    expect(redisService.set).toHaveBeenCalledWith(
      "tournament:t1",
      expect.stringContaining('"id":"t1"'),
      60,
    );
    const cached = JSON.parse(redisService.set.mock.calls[0][1] as string);
    expect(cached.matches).toEqual([]);
    expect(cached.participants).toEqual([]);
  });
});
