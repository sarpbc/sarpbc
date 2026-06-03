import { Body, Controller, Get, Post } from "@nestjs/common";
import { AirRiddleService } from "./airriddle.service";

@Controller("air-riddle")
export class AirRiddleController {
  constructor(private airRiddleService: AirRiddleService) {}

  @Get("today")
  async find() {
    const todayRiddle = await this.airRiddleService.getTodaysRiddle();
    return { length: todayRiddle?.playerName.length };
  }

  @Post("guess")
  async guess(@Body() body: { guess: string; last?: boolean }) {
    const { results, error, answer } = await this.airRiddleService.guess(body.guess, body.last);
    return { results, error, answer };
  }
}
