import { evaluateGuess } from "../domain/airriddle";
import type { DailyRiddle } from "../domain/airriddle";
import { AirRiddleResultEnum } from "../domain/airriddle-result.enum";
import type { DailyRiddles, RiddlePlayers, RiddleRuntime } from "./ports";

export class AirRiddleService {
  constructor(
    private readonly riddles: DailyRiddles,
    private readonly players: RiddlePlayers,
    private readonly runtime: RiddleRuntime,
  ) {}
  async getTodaysRiddle(): Promise<DailyRiddle | null> {
    return (
      (await this.riddles.findTodaysRiddle(this.runtime.dayStart())) ??
      (await this.createAirRiddle())
    );
  }
  async guess(
    guess: string,
    last?: boolean,
  ): Promise<{ results: AirRiddleResultEnum[]; error?: string; answer?: string }> {
    const players = await this.players.find({ name: guess });

    if (!players.some((p) => p.name.toUpperCase() === guess.toUpperCase())) {
      return { error: "playerNotFound", results: [] };
    }

    const riddle = await this.getTodaysRiddle();

    if (!riddle) {
      throw new Error("Failed to create AirRiddle");
    }

    const results = evaluateGuess(guess.toUpperCase(), riddle.playerName.toUpperCase());

    return {
      answer:
        results.every((r) => r === AirRiddleResultEnum.CORRECT) || last === true
          ? riddle.playerName
          : undefined,
      results,
    };
  }
  async createAirRiddle(): Promise<DailyRiddle | null> {
    try {
      if (await this.riddles.findTodaysRiddle(this.runtime.dayStart())) {
        return null;
      }

      const player = await this.players.getRandomPlayer();

      if (!player) {
        this.runtime.skipped();

        return null;
      }

      const riddle = {
        createdAt: this.runtime.now(),
        id: this.runtime.id(),
        playerId: player.id,
        playerName: player.name,
      };

      await this.riddles.save(riddle);

      return riddle;
    } catch (error) {
      this.runtime.error(error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }
}
