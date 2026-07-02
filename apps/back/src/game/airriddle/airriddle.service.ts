import { Injectable } from "@nestjs/common";
import { MikroORM } from "@mikro-orm/core";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { AirRiddleRepository } from "./airriddle.repository";
import { PlayerService } from "src/player/player.service";
import { AirRiddleResultEnum } from "./enum/airriddle-result.enum";
import { Cron } from "@nestjs/schedule";
import { DateTime } from "luxon";
import { AirRiddle } from "./domain/airriddle.entity";

@Injectable()
export class AirRiddleService {
  constructor(
    private readonly airRiddleRepository: AirRiddleRepository,
    private readonly playerService: PlayerService,
    // MikroORM is required for @CreateRequestContext() on the cron method
    private readonly orm: MikroORM,
  ) {}

  async getTodaysRiddle(): Promise<AirRiddle | null> {
    const todayStart = this.getTodayStart();
    const airRiddle = await this.airRiddleRepository.findTodaysRiddle(todayStart);

    if (airRiddle === null) {
      const newAirRiddle = await this.createAirRiddle();
      return newAirRiddle;
    }

    return airRiddle;
  }

  async guess(
    guess: string,
    last?: boolean,
  ): Promise<{
    results: AirRiddleResultEnum[];
    error?: string;
    answer?: string;
  }> {
    const players = await this.playerService.find({ name: guess });
    const hasMatchedAPlayer = players.some(
      (player) => player.name.toUpperCase() === guess.toUpperCase(),
    );

    if (!hasMatchedAPlayer) {
      return {
        results: [],
        error: "playerNotFound",
      };
    }

    const todayStart = this.getTodayStart();
    let todayAirRiddle = await this.airRiddleRepository.findTodaysRiddle(todayStart);

    if (todayAirRiddle === null) {
      todayAirRiddle = await this.createAirRiddle();
      if (todayAirRiddle === null) {
        throw new Error("Failed to create AirRiddle");
      }
    }

    const results = this.checkGuess(guess.toUpperCase(), todayAirRiddle.playerName.toUpperCase());

    if (results.every((result) => result === AirRiddleResultEnum.CORRECT)) {
      return {
        results: results,
        answer: todayAirRiddle.playerName,
      };
    }

    return {
      results: results,
      answer: last === true ? todayAirRiddle.playerName : undefined,
    };
  }

  @Cron("0 0 * * *", {
    timeZone: "Europe/Berlin",
  })
  @CreateRequestContext()
  async createAirRiddle(): Promise<AirRiddle | null> {
    const todayStart = this.getTodayStart();
    const todayAirRiddle = await this.airRiddleRepository.findTodaysRiddle(todayStart);
    if (todayAirRiddle) {
      return null;
    }

    const randomPlayer = await this.playerService.getRandomPlayer();
    if (randomPlayer === null) {
      throw new Error("No player found");
    }

    const airRiddle = new AirRiddle();
    airRiddle.playerId = randomPlayer.id;
    airRiddle.playerName = randomPlayer.name;

    await this.airRiddleRepository.save(airRiddle);
    return airRiddle;
  }

  private checkGuess(guess: string, answer: string): AirRiddleResultEnum[] {
    const results: AirRiddleResultEnum[] = new Array(guess.length);
    const answerLetters: (string | null)[] = answer.split("");

    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === answer[i]) {
        results[i] = AirRiddleResultEnum.CORRECT;
        answerLetters[i] = null;
      }
    }

    for (let i = 0; i < guess.length; i++) {
      if (results[i] === undefined) {
        const letterIndex = answerLetters.indexOf(guess[i]);
        if (letterIndex !== -1) {
          results[i] = AirRiddleResultEnum.MISPLACED;
          answerLetters[letterIndex] = null;
        } else {
          results[i] = AirRiddleResultEnum.INCORRECT;
        }
      }
    }
    return results;
  }

  private getTodayStart(): Date {
    return DateTime.now().setZone("Europe/Berlin").startOf("day").toJSDate();
  }
}
