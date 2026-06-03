import { Controller, Get, Query } from "@nestjs/common";
import { MatchService } from "./match.service";

@Controller("matches")
export class MatchController {
  constructor(private matchService: MatchService) {}

  @Get("upcoming")
  async findUpcoming(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("today") today?: string,
  ) {
    const searchLimit = limit ? parseInt(limit, 10) : 20;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    const todayOnly = today === "true";

    const [upcomingMatches, liveMatches] = await Promise.all([
      this.matchService.findUpcoming({
        limit: Math.min(searchLimit, 100),
        offset: searchOffset,
        todayOnly,
      }),
      this.matchService.findLive({
        limit: Math.min(searchLimit, 100),
        offset: searchOffset,
        todayOnly,
      }),
    ]);

    return {
      upcoming: upcomingMatches,
      live: liveMatches,
    };
  }

  @Get("results")
  async findResults(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    const searchLimit = limit ? parseInt(limit, 10) : 20;
    const searchOffset = offset ? parseInt(offset, 10) : 0;

    const results = await this.matchService.findResults({
      limit: Math.min(searchLimit, 100),
      offset: searchOffset,
    });

    return {
      results,
    };
  }
}
