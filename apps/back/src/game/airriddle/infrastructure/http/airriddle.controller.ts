import { Body, Controller, Get, Post, Request } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AirRiddleService } from "../../application/airriddle.service";
import { PostHogService } from "../../../../infrastructure/telemetry/posthog.service";
import { captureRequestEvent } from "../../../../infrastructure/telemetry/capture-request-event";
import { GuessDto, type GuessInput } from "./dto/guess.dto";

@Controller("air-riddle")
export class AirRiddleController {
  constructor(
    private readonly airRiddleService: AirRiddleService,
    private readonly posthog: PostHogService,
  ) {}

  @Get("today")
  async find() {
    const todayRiddle = await this.airRiddleService.getTodaysRiddle();

    return { length: todayRiddle?.playerName.length };
  }

  @Post("guess")
  async guess(@Body({ schema: GuessDto }) body: GuessInput, @Request() req: FastifyRequest) {
    const { results, error, answer } = await this.airRiddleService.guess(body.guess, body.last);
    await captureRequestEvent(this.posthog, req.headers, "server_airriddle_guess_submitted", {
      is_last: body.last ?? false,
    });

    return { results, error, answer };
  }
}
