import { Body, Controller, Get, Post, Request } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AirRiddleService } from "../../application/airriddle.service";
import { PostHogService } from "../../../../infrastructure/telemetry/posthog.service";
import { GuessDto } from "./dto/guess.dto";

@Controller("air-riddle")
export class AirRiddleController {
  constructor(
    private airRiddleService: AirRiddleService,
    private readonly posthog: PostHogService,
  ) {}

  @Get("today")
  async find() {
    const todayRiddle = await this.airRiddleService.getTodaysRiddle();
    return { length: todayRiddle?.playerName.length };
  }

  @Post("guess")
  async guess(@Body({ schema: GuessDto }) body: GuessDto, @Request() req: FastifyRequest) {
    const { results, error, answer } = await this.airRiddleService.guess(body.guess, body.last);
    const distinctId = req.headers["x-posthog-distinct-id"] as string | undefined;
    const sessionId = req.headers["x-posthog-session-id"] as string | undefined;
    this.posthog.capture({
      distinctId,
      event: "server_airriddle_guess_submitted",
      sessionId,
      properties: { is_last: body.last ?? false },
    });
    await this.posthog.flush();
    return { results, error, answer };
  }
}
