import type { TournamentPlayerStatsResponse } from "@sarpbc/types";
import { Controller, Get, Header } from "@nestjs/common";
import { CachedOverallPlayerStatsRead } from "../cache/cached-overall-player-stats.read";

@Controller("stats")
export class PlayerStatsController {
  constructor(private readonly stats: CachedOverallPlayerStatsRead) {}

  @Get("players")
  @Header("Cache-Control", "public, max-age=60")
  async players() {
    return (await this.stats.overall()) satisfies TournamentPlayerStatsResponse;
  }
}
