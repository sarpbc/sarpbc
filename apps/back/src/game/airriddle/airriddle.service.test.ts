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
    getRandomPlayer: vi.fn<RiddlePlayers["getRandomPlayer"]>(),
    find: vi.fn<RiddlePlayers["find"]>(),
  };

  const runtime = {
    dayStart: () => new Date("2026-10-14T22:00:00Z"),
    now: () => new Date("2026-10-15T12:00:00Z"),
    id: () => "riddle-1",
    skipped: vi.fn<RiddleRuntime["skipped"]>(),
    error: vi.fn<RiddleRuntime["error"]>(),
  };

  const riddle = (id: string): DailyRiddle => ({
    id,
    playerId: "player-1",
    playerName: "Kaydop",
    createdAt: runtime.now(),
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
      id: "riddle-1",
      playerId: "player-1",
      playerName: "Kaydop",
      createdAt: runtime.now(),
    });
    expect(repository.save).toHaveBeenCalledExactlyOnceWith({
      id: "riddle-1",
      playerId: "player-1",
      playerName: "Kaydop",
      createdAt: runtime.now(),
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
