import { Controller, Get, Header, Inject, Param, Query } from "@nestjs/common";
import { NEWS_MATCH_BLOCKS_PER_REQUEST, parseNewsMatchBlockKey } from "@sarpbc/utils";
import type {
  CountedMatchListItem,
  MatchBlockSelector,
  MatchBlocksResponse,
  MatchListItem,
  MatchResultsResponse,
  UpcomingMatchesResponse,
} from "@sarpbc/types";
import type { MatchService } from "../../application/match/match.service";
import type { MatchLineupService } from "../../application/match/match-lineup.service";
import type { MatchListScopeFilters } from "../../application/match/match-list-filters";
import { mapMatchBlockItem, mapMatchListItem, withPublicSlug } from "./match-list.mapper";
import type { ReplyService } from "../../../reply/application/reply.service";
import type { GameStatsStore } from "../../../match-stats/application/ports";
import { GAME_STATS_STORE } from "../../../match-stats/infrastructure/game-stats.tokens";
import { EntityRefPipe } from "../../../common/infrastructure/http/entity-ref.pipe";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { nonBlank } from "../../../common/domain/text";

function parseMatchBlockKeys(raw?: string | string[]): Map<string, MatchBlockSelector> {
  const keys = [...new Set([raw ?? []].flat())];

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
    tournamentId: nonBlank(tournamentId),
    leagueId: nonBlank(leagueId),
  };
}

function parsePagingValue(name: string, value?: string): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new InvalidInputError(`Invalid ${name} "${value}".`);
  }

  return parsed;
}

function parsePaging(limit?: string, offset?: string) {
  return {
    limit: parsePagingValue("limit", limit),
    offset: parsePagingValue("offset", offset) ?? 0,
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
    private readonly matchService: MatchService,
    private readonly replyService: ReplyService,
    private readonly lineupService: MatchLineupService,
    @Inject(GAME_STATS_STORE) private readonly gameStats: GameStatsStore,
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

    const [games, lineups] = await Promise.all([
      this.gameStats.byMatch(detail.match.id),
      this.lineupService.forMatch(detail.match),
    ]);

    return {
      ...detail,
      match: { ...withPublicSlug(detail.match), watchStreams: detail.match.watchStreams() },
      games,
      lineups,
    };
  }
}
