import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { NEWS_MATCH_BLOCKS_PER_REQUEST, parseNewsMatchBlockKey } from "@sarpbc/utils";
import type {
  CountedMatchListItem,
  MatchBlockSelector,
  MatchBlocksResponse,
  MatchListItem,
  MatchResultsResponse,
  UpcomingMatchesResponse,
} from "@sarpbc/types";
import { MatchService } from "../../application/match/match.service";
import type { MatchListScopeFilters } from "../../application/match/match-list-filters";
import { mapMatchBlockItem, mapMatchListItem, withPublicSlug } from "./match-list.mapper";
import { ReplyService } from "../../../reply/application/reply.service";
import { MatchGamesService } from "../../../match-stats/application/match-games.service";
import { EntityRefPipe } from "../../../common/infrastructure/http/entity-ref.pipe";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { InvalidInputError } from "../../../common/domain/errors";

function parseMatchBlockKeys(raw?: string | string[]): Map<string, MatchBlockSelector> {
  const keys = [...new Set(raw === undefined ? [] : Array.isArray(raw) ? raw : [raw])];
  if (keys.length === 0 || keys.length > NEWS_MATCH_BLOCKS_PER_REQUEST) {
    throw new InvalidInputError(
      `Request between 1 and ${NEWS_MATCH_BLOCKS_PER_REQUEST} match blocks.`,
    );
  }
  return new Map(
    keys.map((key) => {
      const block = parseNewsMatchBlockKey(key);
      if (!block) {
        throw new InvalidInputError(`Invalid match block "${key}".`);
      }
      return [key, block];
    }),
  );
}

function parseListScopeFilters(tournamentId?: string, leagueId?: string): MatchListScopeFilters {
  return {
    tournamentId: tournamentId?.trim() || undefined,
    leagueId: leagueId?.trim() || undefined,
  };
}

function parsePaging(limit?: string, offset?: string) {
  return {
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : 0,
  };
}

function attachCommentCounts(
  items: MatchListItem[],
  counts: Map<string, number>,
): CountedMatchListItem[] {
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
    private matchGames: MatchGamesService,
  ) {}

  @Get("upcoming")
  async findUpcoming(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("today") today?: string,
    @Query("tournamentId") tournamentId?: string,
    @Query("leagueId") leagueId?: string,
  ): Promise<UpcomingMatchesResponse> {
    const options = {
      ...parsePaging(limit, offset),
      todayOnly: today === "true",
      ...parseListScopeFilters(tournamentId, leagueId),
    };

    const [[upcomingMatches, upcomingTotal], [liveMatches, liveTotal]] = await Promise.all([
      this.matchService.list("upcoming", options),
      this.matchService.list("live", options),
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
  ): Promise<MatchResultsResponse> {
    const [results, total] = await this.matchService.list("results", {
      ...parsePaging(limit, offset),
      ...parseListScopeFilters(tournamentId, leagueId),
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

  @Get("blocks")
  @Header("Cache-Control", "public, max-age=10")
  async findBlocks(@Query("block") block?: string | string[]): Promise<MatchBlocksResponse> {
    const blocks = parseMatchBlockKeys(block);
    const now = new Date();
    const found = await this.matchService.findBlocks([...blocks.values()], now);
    const commentCounts = await this.replyService.countByTargetIds("match", [
      ...new Set(found.flat().map((match) => match.id)),
    ]);

    return {
      blocks: Object.fromEntries(
        [...blocks.keys()].map((key, index) => [
          key,
          (found[index] ?? []).map((match) =>
            mapMatchBlockItem(match, now, commentCounts.get(match.id) ?? 0),
          ),
        ]),
      ),
    };
  }

  @Get(":ref")
  async findOne(@Param("ref", EntityRefPipe) ref: EntityRef) {
    const detail = await this.matchService.findDetail(ref);
    const games = await this.matchGames.forMatch(detail.match.id);
    return { ...detail, match: withPublicSlug(detail.match), games };
  }
}
