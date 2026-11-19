import { describe, expect, it } from "vitest";
import { AirRiddleService } from "./application/airriddle.service";
import { InMemoryDailyRiddles } from "./application/in-memory-daily-riddles.test-utils";
import { InMemoryRiddlePlayers } from "./application/in-memory-riddle-players.test-utils";
import { RecordingRiddleRuntime } from "./application/recording-riddle-runtime.test-utils";
import { evaluateGuess } from "./domain/airriddle";
import { AirRiddleResultEnum as Result } from "./domain/airriddle-result.enum";

describe(AirRiddleService, () => {
  const today = new RecordingRiddleRuntime().now();

  const riddle = (id: string) => ({
    createdAt: today,
    id,
    playerId: "player-1",
    playerName: "Kaydop",
  });

  it("creates a riddle with a randomly selected player", async () => {
    const riddles = new InMemoryDailyRiddles();

    const service = new AirRiddleService(
      riddles,
      new InMemoryRiddlePlayers([{ id: "player-1", name: "Kaydop" }]),
      new RecordingRiddleRuntime(),
    );

    await expect(service.createAirRiddle()).resolves.toStrictEqual({
      createdAt: today,
      id: "riddle-1",
      playerId: "player-1",
      playerName: "Kaydop",
    });
    expect(riddles.saved).toStrictEqual([
      {
        createdAt: today,
        id: "riddle-1",
        playerId: "player-1",
        playerName: "Kaydop",
      },
    ]);
  });

  it("returns null when no player exists", async () => {
    const riddles = new InMemoryDailyRiddles();
    const runtime = new RecordingRiddleRuntime();
    const service = new AirRiddleService(riddles, new InMemoryRiddlePlayers([]), runtime);

    await expect(service.createAirRiddle()).resolves.toBeNull();
    expect(riddles.saved).toStrictEqual([]);
    expect(runtime.skippedCount).toBe(1);
  });

  it("reports persistence failure without rethrowing", async () => {
    const failure = new Error("db down");
    const runtime = new RecordingRiddleRuntime();

    const service = new AirRiddleService(
      new InMemoryDailyRiddles(null, failure),
      new InMemoryRiddlePlayers([{ id: "p", name: "Kaydop" }]),
      runtime,
    );

    await expect(service.createAirRiddle()).resolves.toBeNull();
    expect(runtime.errors).toStrictEqual([failure]);
  });

  it("does not replace an existing daily riddle", async () => {
    const riddles = new InMemoryDailyRiddles(riddle("existing"));

    const service = new AirRiddleService(
      riddles,
      new InMemoryRiddlePlayers([{ id: "player-2", name: "Zen" }]),
      new RecordingRiddleRuntime(),
    );

    await expect(service.createAirRiddle()).resolves.toBeNull();
    expect(riddles.saved).toStrictEqual([]);
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
    const service = new AirRiddleService(
      new InMemoryDailyRiddles(riddle("today")),
      new InMemoryRiddlePlayers([
        { id: "player-2", name: "Zen" },
        { id: "player-1", name: "Kaydop" },
      ]),
      new RecordingRiddleRuntime(),
    );

    const guessResult = await service.guess("Zen");
    expect(guessResult.answer).toBeUndefined();
    const guessResult2 = await service.guess("Zen", true);
    expect(guessResult2.answer).toBe("Kaydop");
    const guessResult3 = await service.guess("kaydop");
    expect(guessResult3.answer).toBe("Kaydop");
  });
});
