import { Controller, Get, Param, Query } from "@nestjs/common";
import { parseNewsMatchBlockKey, type NewsMatchBlock } from "@sarpbc/utils";
import type { MatchBlocksResponse } from "@sarpbc/types";
import { MatchService } from "../../application/match/match.service";
import type { MatchListScopeFilters } from "../../application/match/match-list-filters";
import { mapMatchBlockItem, mapMatchListItem, withPublicSlug } from "./match-list.mapper";
import { ReplyService } from "../../../reply/application/reply.service";
import { EntityRefPipe } from "../../../common/infrastructure/http/entity-ref.pipe";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { InvalidInputError } from "../../../common/domain/errors";

const MAX_MATCH_BLOCKS = 20;

function parseMatchBlockKeys(raw?: string | string[]): Map<string, NewsMatchBlock> {
  const keys = [...new Set(raw === undefined ? [] : Array.isArray(raw) ? raw : [raw])];
  if (keys.length === 0 || keys.length > MAX_MATCH_BLOCKS) {
    throw new InvalidInputError(`Request between 1 and ${MAX_MATCH_BLOCKS} match blocks.`);
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

  @Get("blocks")
  async findBlocks(@Query("block") block?: string | string[]): Promise<MatchBlocksResponse> {
    const blocks = parseMatchBlockKeys(block);
    const found = await this.matchService.findBlocks([...blocks.values()]);
    const commentCounts = await this.replyService.countByTargetIds("match", [
      ...new Set(found.flat().map((match) => match.id)),
    ]);
    const now = new Date();

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
    return { ...detail, match: withPublicSlug(detail.match) };
  }
}
