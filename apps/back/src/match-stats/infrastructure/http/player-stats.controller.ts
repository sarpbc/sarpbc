import type { TournamentPlayerStatsResponse } from "@sarpbc/types";
import { Controller, Get } from "@nestjs/common";
import { TournamentPlayerStatsService } from "../../application/tournament-player-stats.service";

@Controller("stats")
export class PlayerStatsController {
  constructor(private readonly service: TournamentPlayerStatsService) {}

  @Get("players")
  async players() {
    return (await this.service.overall()) satisfies TournamentPlayerStatsResponse;
  }
}
