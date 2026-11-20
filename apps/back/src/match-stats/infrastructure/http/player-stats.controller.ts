import type { TournamentPlayerStatsResponse } from "@sarpbc/types";
import { Controller, Get, Header, Query } from "@nestjs/common";
import { CachedOverallPlayerStatsRead } from "../cache/cached-overall-player-stats.read";
import { PlayerStatsQueryDto } from "./dto/player-stats-query.dto";
import type { PlayerStatsQueryInput } from "./dto/player-stats-query.dto";

@Controller("stats")
export class PlayerStatsController {
  constructor(private readonly stats: CachedOverallPlayerStatsRead) {}

  @Get("players")
  @Header("Cache-Control", "public, max-age=60")
  async players(@Query({ schema: PlayerStatsQueryDto }) query: PlayerStatsQueryInput) {
    return (await this.stats.overall(query.era ?? null)) satisfies TournamentPlayerStatsResponse;
  }
}
