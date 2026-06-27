import { Controller, Get, Param, Query } from "@nestjs/common";
import { MatchService } from "./match.service";
import type { MatchListScopeFilters } from "./match-list-filters";

function parseListScopeFilters(tournamentId?: string, leagueId?: string): MatchListScopeFilters {
  return {
    tournamentId: tournamentId?.trim() || undefined,
    leagueId: leagueId?.trim() || undefined,
  };
}

@Controller("matches")
export class MatchController {
  constructor(private matchService: MatchService) {}

  @Get("upcoming")
  async findUpcoming(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("today") today?: string,
    @Query("tournamentId") tournamentId?: string,
    @Query("leagueId") leagueId?: string,
  ) {
    const searchLimitRaw = limit ? parseInt(limit, 10) : 20;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    const searchLimit = Math.min(searchLimitRaw, 100);
    const todayOnly = today === "true";
    const scope = parseListScopeFilters(tournamentId, leagueId);

    const [[upcomingMatches, upcomingTotal], [liveMatches, liveTotal]] = await Promise.all([
      this.matchService.findUpcomingAndCount({
        limit: searchLimit,
        offset: searchOffset,
        todayOnly,
        ...scope,
      }),
      this.matchService.findLiveAndCount({
        limit: searchLimit,
        offset: searchOffset,
        todayOnly,
        ...scope,
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
  async findResults(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("tournamentId") tournamentId?: string,
    @Query("leagueId") leagueId?: string,
  ) {
    const searchLimitRaw = limit ? parseInt(limit, 10) : 20;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    const searchLimit = Math.min(searchLimitRaw, 100);
    const scope = parseListScopeFilters(tournamentId, leagueId);

    const [results, total] = await this.matchService.findResultsAndCount({
      limit: searchLimit,
      offset: searchOffset,
      ...scope,
    });

    return {
      results,
      total,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.matchService.findDetailById(id);
  }
}
