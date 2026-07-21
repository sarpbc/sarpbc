import { Body, Controller, Get, Post, Request } from "@nestjs/common";
import { AirRiddleService } from "./airriddle.service";
import { PostHogService } from "src/posthog/posthog.service";

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
  async guess(@Body() body: { guess: string; last?: boolean }, @Request() req: any) {
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
