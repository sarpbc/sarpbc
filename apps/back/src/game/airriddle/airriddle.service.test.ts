import { beforeEach, describe, expect, it, vi } from "vitest";
import { AirRiddleService } from "./application/airriddle.service";
import type { DailyRiddles, RiddlePlayers, RiddleRuntime } from "./application/ports";
import { evaluateGuess } from "./domain/airriddle";
import type { DailyRiddle } from "./domain/airriddle";
import { AirRiddleResultEnum as Result } from "./domain/airriddle-result.enum";

describe(AirRiddleService, () => {
  const repository = {
    findTodaysRiddle: vi.fn<DailyRiddles["findTodaysRiddle"]>(),
    save: vi.fn<DailyRiddles["save"]>(),
  };

  const players = {
    find: vi.fn<RiddlePlayers["find"]>(),
    getRandomPlayer: vi.fn<RiddlePlayers["getRandomPlayer"]>(),
  };

  const runtime = {
    dayStart: () => new Date("2026-10-14T22:00:00Z"),
    error: vi.fn<RiddleRuntime["error"]>(),
    id: () => "riddle-1",
    now: () => new Date("2026-10-15T12:00:00Z"),
    skipped: vi.fn<RiddleRuntime["skipped"]>(),
  };

  const riddle = (id: string): DailyRiddle => ({
    createdAt: runtime.now(),
    id,
    playerId: "player-1",
    playerName: "Kaydop",
  });

  let service: AirRiddleService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new AirRiddleService(repository, players, runtime);
  });

  it("creates a riddle with a randomly selected player", async () => {
    repository.findTodaysRiddle.mockResolvedValue(null);
    players.getRandomPlayer.mockResolvedValue({ id: "player-1", name: "Kaydop" });
    repository.save.mockResolvedValue(undefined);
    await expect(service.createAirRiddle()).resolves.toStrictEqual({
      createdAt: runtime.now(),
      id: "riddle-1",
      playerId: "player-1",
      playerName: "Kaydop",
    });
    expect(repository.save).toHaveBeenCalledExactlyOnceWith({
      createdAt: runtime.now(),
      id: "riddle-1",
      playerId: "player-1",
      playerName: "Kaydop",
    });
    expect(runtime.error).not.toHaveBeenCalled();
  });

  it("returns null when no player exists", async () => {
    repository.findTodaysRiddle.mockResolvedValue(null);
    players.getRandomPlayer.mockResolvedValue(null);
    await expect(service.createAirRiddle()).resolves.toBeNull();
    expect(repository.save).not.toHaveBeenCalled();
    expect(runtime.skipped).toHaveBeenCalledOnce();
  });

  it("reports persistence failure without rethrowing", async () => {
    const failure = new Error("db down");
    repository.findTodaysRiddle.mockResolvedValue(null);
    players.getRandomPlayer.mockResolvedValue({ id: "p", name: "Kaydop" });
    repository.save.mockRejectedValue(failure);
    await expect(service.createAirRiddle()).resolves.toBeNull();
    expect(runtime.error).toHaveBeenCalledWith(failure);
  });

  it("does not replace an existing daily riddle", async () => {
    repository.findTodaysRiddle.mockResolvedValue(riddle("existing"));
    await expect(service.createAirRiddle()).resolves.toBeNull();
    expect(players.getRandomPlayer).not.toHaveBeenCalled();
  });

  it("consumes repeated letters only once after exact matches", () => {
    expect(evaluateGuess("AAA", "ABA")).toStrictEqual([
      Result.CORRECT,
      Result.INCORRECT,
      Result.CORRECT,
    ]);
    expect(evaluateGuess("BAA", "ABC")).toStrictEqual([
      Result.MISPLACED,
      Result.MISPLACED,
      Result.INCORRECT,
    ]);
  });

  it("reveals the answer only after success or the final guess", async () => {
    repository.findTodaysRiddle.mockResolvedValue(riddle("today"));
    players.find.mockResolvedValue([{ name: "Zen" }]);
    const guessResult = await service.guess("Zen");
    expect(guessResult.answer).toBeUndefined();
    const guessResult2 = await service.guess("Zen", true);
    expect(guessResult2.answer).toBe("Kaydop");
    players.find.mockResolvedValue([{ name: "Kaydop" }]);
    const guessResult3 = await service.guess("kaydop");
    expect(guessResult3.answer).toBe("Kaydop");
  });
});
