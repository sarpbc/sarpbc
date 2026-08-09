import { Controller, Get, Param, Query } from "@nestjs/common";
import { MatchService } from "./match.service";
import type { MatchListScopeFilters } from "./match-list-filters";
import { mapMatchListItem } from "./match-list.mapper";
import { ReplyService } from "src/reply/reply.service";

function parseListScopeFilters(tournamentId?: string, leagueId?: string): MatchListScopeFilters {
  return {
    tournamentId: tournamentId?.trim() || undefined,
    leagueId: leagueId?.trim() || undefined,
  };
}

function attachCommentCounts<T extends { id: string }>(
  items: T[],
  counts: Map<string, number>,
): Array<T & { commentCount: number }> {
  return items.map((item) => ({
    ...item,
    commentCount: counts.get(item.id) ?? 0,
  }));
}

@Controller("matches")
export class MatchController {
  constructor(
    private matchService: MatchService,
    private replyService: ReplyService,
  ) {}

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

    const matchIds = [...upcomingMatches, ...liveMatches].map((match) => match.id);
    const commentCounts = await this.replyService.countByTargetIds("match", matchIds);

    return {
      upcoming: attachCommentCounts(upcomingMatches.map(mapMatchListItem), commentCounts),
      live: attachCommentCounts(liveMatches.map(mapMatchListItem), commentCounts),
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

    const commentCounts = await this.replyService.countByTargetIds(
      "match",
      results.map((match) => match.id),
    );

    return {
      results: attachCommentCounts(results.map(mapMatchListItem), commentCounts),
      total,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.matchService.findDetailById(id);
  }
}
