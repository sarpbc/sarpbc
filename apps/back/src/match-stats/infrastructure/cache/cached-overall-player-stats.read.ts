import { log } from "evlog";
import { z } from "zod";
import type { TournamentPlayerStatsResponse } from "@sarpbc/types";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentPlayerStatsService } from "../../application/tournament-player-stats.service";

const KEY = "player-stats:overall";
const TTL_SECONDS = 60;

const counts = z.object({
  assists: z.number(),
  demolitions: z.number(),
  goals: z.number(),
  saves: z.number(),
  shots: z.number(),
});

const response = z.object({
  games: z.number(),
  players: z.array(
    z.object({
      games: z.number(),
      goalParticipation: z.number().nullable(),
      perGame: counts,
      player: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
      shootingPercentage: z.number().nullable(),
      team: z.object({ id: z.string().nullable(), name: z.string(), slug: z.string().nullable() }),
      totals: counts,
    }),
  ),
  unlinkedAccounts: z.number(),
}) satisfies z.ZodType<TournamentPlayerStatsResponse>;

const diagnose = (operation: string, error: Error) => {
  log.warn({
    component: "CachedOverallPlayerStatsRead",
    error,
    key: KEY,
    message: "Optional overall player stats cache failed",
    operation,
  });
};

export class CachedOverallPlayerStatsRead {
  private pending: Promise<TournamentPlayerStatsResponse> | null = null;

  constructor(
    private readonly stats: Pick<TournamentPlayerStatsService, "overall">,
    private readonly redis: Pick<RedisService, "get" | "set">,
  ) {}

  async overall() {
    this.pending ??= this.load().finally(() => {
      this.pending = null;
    });

    return (await this.pending) satisfies TournamentPlayerStatsResponse;
  }

  private async load() {
    const cached = await this.readCached();

    if (cached) {
      return cached satisfies TournamentPlayerStatsResponse;
    }

    const stats = await this.stats.overall();

    try {
      await this.redis.set(KEY, JSON.stringify(stats), TTL_SECONDS);
    } catch (error) {
      diagnose("write", error instanceof Error ? error : new Error(String(error)));
    }

    return stats satisfies TournamentPlayerStatsResponse;
  }

  private async readCached() {
    try {
      const cached = await this.redis.get(KEY);

      if (cached === null) {
        return null;
      }

      const result = response.safeParse(JSON.parse(cached));

      if (!result.success) {
        diagnose("decode", result.error);

        return null;
      }

      return result.data satisfies TournamentPlayerStatsResponse;
    } catch (error) {
      diagnose("read", error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }
}
