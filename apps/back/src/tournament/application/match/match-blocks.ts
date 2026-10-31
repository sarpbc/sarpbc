import type { MatchBlockSelector } from "@sarpbc/types";
import type { Match } from "../../domain/competition";
import type { MatchQueries } from "../ports";
import type { MatchListQueryOptions } from "./match-list-filters";

export const MATCH_BLOCK_LIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

type ScopedMatchBlock = Extract<MatchBlockSelector, { kind: "tournament" | "team" }>;

export type MatchBlockReads = Pick<MatchQueries, "byIds" | "page">;

export function isMatchBlockLive(match: Match, now: Date): boolean {
  return (
    !match.hasEnded() &&
    match.beginAt !== null &&
    match.beginAt <= now &&
    now.getTime() - match.beginAt.getTime() <= MATCH_BLOCK_LIVE_WINDOW_MS
  );
}

function isScoped(block: MatchBlockSelector): block is ScopedMatchBlock {
  return block.kind === "tournament" || block.kind === "team";
}

function scopeKey(block: ScopedMatchBlock): string {
  return `${block.kind}:${block.id}`;
}

async function findScope(
  reads: MatchBlockReads,
  block: ScopedMatchBlock,
  limit: number,
  now: Date,
): Promise<Match[]> {
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
}

export async function findMatchBlocks(
  reads: MatchBlockReads,
  blocks: readonly MatchBlockSelector[],
  now: Date,
): Promise<Match[][]> {
  const ids = [
    ...new Set(
      blocks.flatMap((block) =>
        block.kind === "match" ? [block.id] : block.kind === "matches" ? block.ids : [],
      ),
    ),
  ];
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
  const scoped = new Map<string, Match[]>();
  for (const [key, { block, limit }] of limits) {
    scoped.set(key, await findScope(reads, block, limit, now));
  }

  return blocks.map((block) => {
    switch (block.kind) {
      case "match":
        return pick(block.id);
      case "matches":
        return block.ids.flatMap(pick);
      case "tournament":
      case "team":
        return (scoped.get(scopeKey(block)) ?? []).slice(0, block.limit);
      default: {
        const exhaustive: never = block;
        return exhaustive;
      }
    }
  });
}
