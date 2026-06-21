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
    const searchLimitRaw = limit ? parseInt(limit, 10) : 20;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    const searchLimit = Math.min(searchLimitRaw, 100);
    const todayOnly = today === "true";

    const [[upcomingMatches, upcomingTotal], [liveMatches, liveTotal]] = await Promise.all([
      this.matchService.findUpcomingAndCount({
        limit: searchLimit,
        offset: searchOffset,
        todayOnly,
      }),
      this.matchService.findLiveAndCount({
        limit: searchLimit,
        offset: searchOffset,
        todayOnly,
      }),
    ]);

    return {
      upcoming: upcomingMatches,
      live: liveMatches,
      upcomingTotal,
      liveTotal,
      total: upcomingTotal + liveTotal,
    };
  }

  @Get("results")
  async findResults(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    const searchLimitRaw = limit ? parseInt(limit, 10) : 20;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    const searchLimit = Math.min(searchLimitRaw, 100);

    const [results, total] = await this.matchService.findResultsAndCount({
      limit: searchLimit,
      offset: searchOffset,
    });

    return {
      results,
      total,
    };
  }
}
