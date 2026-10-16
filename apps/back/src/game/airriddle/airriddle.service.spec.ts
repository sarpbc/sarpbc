import { AirRiddleService } from "./application/airriddle.service";
import { evaluateGuess } from "./domain/airriddle";
import { AirRiddleResultEnum as Result } from "./domain/airriddle-result.enum";
describe("AirRiddleService", () => {
  const repository = { findTodaysRiddle: jest.fn(), save: jest.fn() };
  const players = { getRandomPlayer: jest.fn(), find: jest.fn() };
  const runtime = {
    dayStart: () => new Date("2026-10-14T22:00:00Z"),
    now: () => new Date("2026-10-15T12:00:00Z"),
    id: () => "riddle-1",
    skipped: jest.fn(),
    error: jest.fn(),
  };
  let service: AirRiddleService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new AirRiddleService(repository, players, runtime);
  });
  it("creates a riddle with a randomly selected player", async () => {
    repository.findTodaysRiddle.mockResolvedValue(null);
    players.getRandomPlayer.mockResolvedValue({ id: "player-1", name: "Kaydop" });
    repository.save.mockResolvedValue(undefined);
    expect(await service.createAirRiddle()).toEqual({
      id: "riddle-1",
      playerId: "player-1",
      playerName: "Kaydop",
      createdAt: runtime.now(),
    });
    expect(repository.save).toHaveBeenCalled();
    expect(runtime.error).not.toHaveBeenCalled();
  });
  it("returns null when no player exists", async () => {
    repository.findTodaysRiddle.mockResolvedValue(null);
    players.getRandomPlayer.mockResolvedValue(null);
    expect(await service.createAirRiddle()).toBeNull();
    expect(repository.save).not.toHaveBeenCalled();
    expect(runtime.skipped).toHaveBeenCalledWith("no_player");
  });
  it("reports persistence failure without rethrowing", async () => {
    const failure = new Error("db down");
    repository.findTodaysRiddle.mockResolvedValue(null);
    players.getRandomPlayer.mockResolvedValue({ id: "p", name: "Kaydop" });
    repository.save.mockRejectedValue(failure);
    expect(await service.createAirRiddle()).toBeNull();
    expect(runtime.error).toHaveBeenCalledWith(failure);
  });
  it("does not replace an existing daily riddle", async () => {
    repository.findTodaysRiddle.mockResolvedValue({ id: "existing" });
    expect(await service.createAirRiddle()).toBeNull();
    expect(players.getRandomPlayer).not.toHaveBeenCalled();
  });
  it("consumes repeated letters only once after exact matches", () => {
    expect(evaluateGuess("AAA", "ABA")).toEqual([Result.CORRECT, Result.INCORRECT, Result.CORRECT]);
    expect(evaluateGuess("BAA", "ABC")).toEqual([
      Result.MISPLACED,
      Result.MISPLACED,
      Result.INCORRECT,
    ]);
  });
  it("reveals the answer only after success or the final guess", async () => {
    repository.findTodaysRiddle.mockResolvedValue({ playerName: "Kaydop" });
    players.find.mockResolvedValue([{ name: "Zen" }]);
    expect((await service.guess("Zen")).answer).toBeUndefined();
    expect((await service.guess("Zen", true)).answer).toBe("Kaydop");
    players.find.mockResolvedValue([{ name: "Kaydop" }]);
    expect((await service.guess("kaydop")).answer).toBe("Kaydop");
  });
});
