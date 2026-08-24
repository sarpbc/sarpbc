import { Test, TestingModule } from "@nestjs/testing";
import { MikroORM } from "@mikro-orm/core";
import { createLogger } from "evlog";
import { PlayerService } from "src/player/player.service";
import { AirRiddleRepository } from "./airriddle.repository";
import { AirRiddleService } from "./airriddle.service";

describe("AirRiddleService", () => {
  let service: AirRiddleService;
  const airRiddleRepository = {
    findTodaysRiddle: jest.fn(),
    save: jest.fn(),
  };
  const playerService = {
    getRandomPlayer: jest.fn(),
    find: jest.fn(),
  };
  const logger = {
    set: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    (createLogger as jest.Mock).mockReturnValue(logger);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirRiddleService,
        { provide: AirRiddleRepository, useValue: airRiddleRepository },
        { provide: PlayerService, useValue: playerService },
        { provide: MikroORM, useValue: {} },
      ],
    }).compile();

    service = module.get(AirRiddleService);
    jest.clearAllMocks();
    (createLogger as jest.Mock).mockReturnValue(logger);
  });

  describe("createAirRiddle", () => {
    it("creates a riddle when a player exists and none exists today", async () => {
      airRiddleRepository.findTodaysRiddle.mockResolvedValue(null);
      playerService.getRandomPlayer.mockResolvedValue({ id: "player-1", name: "Kaydop" });
      airRiddleRepository.save.mockResolvedValue(undefined);

      const result = await service.createAirRiddle();

      expect(result?.playerId).toBe("player-1");
      expect(result?.playerName).toBe("Kaydop");
      expect(airRiddleRepository.save).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.emit).toHaveBeenCalled();
    });

    it("returns null without throwing when no player exists", async () => {
      airRiddleRepository.findTodaysRiddle.mockResolvedValue(null);
      playerService.getRandomPlayer.mockResolvedValue(null);

      await expect(service.createAirRiddle()).resolves.toBeNull();
      expect(airRiddleRepository.save).not.toHaveBeenCalled();
      expect(logger.set).toHaveBeenCalledWith({ skipped: true, reason: "no_player" });
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.emit).toHaveBeenCalled();
    });

    it("returns null without rethrowing when persistence fails", async () => {
      const failure = new Error("db down");
      airRiddleRepository.findTodaysRiddle.mockResolvedValue(null);
      playerService.getRandomPlayer.mockResolvedValue({ id: "player-1", name: "Kaydop" });
      airRiddleRepository.save.mockRejectedValue(failure);

      await expect(service.createAirRiddle()).resolves.toBeNull();
      expect(logger.error).toHaveBeenCalledWith(failure);
      expect(logger.emit).toHaveBeenCalled();
    });

    it("returns null when today's riddle already exists", async () => {
      airRiddleRepository.findTodaysRiddle.mockResolvedValue({ id: "existing" });

      await expect(service.createAirRiddle()).resolves.toBeNull();
      expect(playerService.getRandomPlayer).not.toHaveBeenCalled();
      expect(logger.emit).toHaveBeenCalled();
    });
  });
});
