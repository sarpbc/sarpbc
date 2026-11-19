import type { TournamentPlayerStatsResponse } from "@sarpbc/types";
import { Controller, Get, Header } from "@nestjs/common";
import { TournamentPlayerStatsService } from "../../application/tournament-player-stats.service";

@Controller("stats")
export class PlayerStatsController {
  constructor(private readonly service: TournamentPlayerStatsService) {}

  @Get("players")
  @Header("Cache-Control", "public, max-age=60")
  async players() {
    return (await this.service.overall()) satisfies TournamentPlayerStatsResponse;
  }
}
