import type { MatchBlockSelector } from "@sarpbc/types";
import { isMatchLive } from "@sarpbc/utils";
import { mapSequentially } from "../../../common/application/sequentially";
import type { Match } from "../../domain/match";
import type { MatchQueries } from "../ports";
import type { MatchListQueryOptions } from "./match-list-filters";

export const MATCH_BLOCK_LIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

type ScopedMatchBlock = Extract<MatchBlockSelector, { kind: "tournament" | "team" }>;

export type MatchBlockReads = Pick<MatchQueries, "byIds" | "page">;

export const isMatchBlockLive = (match: Match, now: Date): boolean => {
  const { beginAt } = match;

  return (
    beginAt !== null &&
    isMatchLive(match, now) &&
    now.getTime() - beginAt.getTime() <= MATCH_BLOCK_LIVE_WINDOW_MS
  );
};

const isScoped = (block: MatchBlockSelector): block is ScopedMatchBlock =>
  block.kind === "tournament" || block.kind === "team";

const scopeKey = (block: ScopedMatchBlock): string => `${block.kind}:${block.id}`;

const findScope = async (
  reads: MatchBlockReads,
  block: ScopedMatchBlock,
  limit: number,
  now: Date,
): Promise<Match[]> => {
  const scope: MatchListQueryOptions =
    block.kind === "tournament" ? { limit, tournamentId: block.id } : { limit, teamId: block.id };

  const [live, upcoming, results] = await Promise.all([
    reads.page("live", {
      ...scope,
      liveSince: new Date(now.getTime() - MATCH_BLOCK_LIVE_WINDOW_MS),
    }),
    reads.page("upcoming", scope),
    reads.page("results", scope),
  ]);

  return [...live, ...upcoming, ...results];
};

const referencedMatchIds = (block: MatchBlockSelector): readonly string[] => {
  switch (block.kind) {
    case "match": {
      return [block.id];
    }

    case "matches": {
      return block.ids;
    }

    case "tournament":
    case "team": {
      return [];
    }

    default: {
      const exhaustive: never = block;

      return exhaustive;
    }
  }
};

export const findMatchBlocks = async (
  reads: MatchBlockReads,
  blocks: readonly MatchBlockSelector[],
  now: Date,
): Promise<Match[][]> => {
  const ids = [...new Set(blocks.flatMap(referencedMatchIds))];

  const byId = new Map(
    (ids.length > 0 ? await reads.byIds(ids) : []).map((match) => [match.id, match]),
  );

  const pick = (id: string): Match[] => {
    const match = byId.get(id);

    return match ? [match] : [];
  };

  const limits = new Map<string, { block: ScopedMatchBlock; limit: number }>();

  for (const block of blocks.filter(isScoped)) {
    const key = scopeKey(block);
    limits.set(key, { block, limit: Math.max(block.limit, limits.get(key)?.limit ?? 0) });
  }

  const scopedEntries = await mapSequentially(
    [...limits],
    async ([key, { block, limit }]): Promise<[string, Match[]]> => [
      key,
      await findScope(reads, block, limit, now),
    ],
  );

  const scoped = new Map(scopedEntries);

  return blocks.map((block) => {
    switch (block.kind) {
      case "match": {
        return pick(block.id);
      }

      case "matches": {
        return block.ids.flatMap(pick);
      }

      case "tournament":
      case "team": {
        return (scoped.get(scopeKey(block)) ?? []).slice(0, block.limit);
      }

      default: {
        const exhaustive: never = block;

        return exhaustive;
      }
    }
  });
};
