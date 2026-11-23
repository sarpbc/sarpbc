import { log } from "evlog";
import { z } from "zod";
import type { StatsEra, StatsGrouping, TournamentPlayerStatsResponse } from "@sarpbc/types";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentPlayerStatsService } from "../../application/tournament-player-stats.service";

const keyOf = (era: StatsEra | null, by: StatsGrouping) =>
  `player-stats:overall:${era ?? "all"}:${by}`;

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
      player: z.object({
        currentTeam: z
          .object({
            darkModeImageUrl: z.string().nullable(),
            imageUrl: z.string().nullable(),
            logoDarkUrl: z.string().nullable(),
            logoLightUrl: z.string().nullable(),
            name: z.string(),
            slug: z.string(),
          })
          .nullable(),
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      }),
      shootingPercentage: z.number().nullable(),
      teams: z.array(
        z.object({ id: z.string().nullable(), name: z.string(), slug: z.string().nullable() }),
      ),
      totals: counts,
    }),
  ),
  unlinkedAccounts: z.number(),
}) satisfies z.ZodType<TournamentPlayerStatsResponse>;

const diagnose = (key: string, operation: string, error: Error) => {
  log.warn({
    component: "CachedOverallPlayerStatsRead",
    error,
    key,
    message: "Optional overall player stats cache failed",
    operation,
  });
};

export class CachedOverallPlayerStatsRead {
  private readonly pending = new Map<string, Promise<TournamentPlayerStatsResponse>>();

  constructor(
    private readonly stats: Pick<TournamentPlayerStatsService, "overall">,
    private readonly redis: Pick<RedisService, "get" | "set">,
  ) {}

  async overall(era: StatsEra | null, by: StatsGrouping) {
    const key = keyOf(era, by);
    let pending = this.pending.get(key);

    if (!pending) {
      pending = this.load(key, era, by).finally(() => {
        this.pending.delete(key);
      });
      this.pending.set(key, pending);
    }

    return (await pending) satisfies TournamentPlayerStatsResponse;
  }

  private async load(key: string, era: StatsEra | null, by: StatsGrouping) {
    const cached = await this.readCached(key);

    if (cached) {
      return cached satisfies TournamentPlayerStatsResponse;
    }

    const stats = await this.stats.overall(era, by);

    try {
      await this.redis.set(key, JSON.stringify(stats), TTL_SECONDS);
    } catch (error) {
      diagnose(key, "write", error instanceof Error ? error : new Error(String(error)));
    }

    return stats satisfies TournamentPlayerStatsResponse;
  }

  private async readCached(key: string) {
    try {
      const cached = await this.redis.get(key);

      if (cached === null) {
        return null;
      }

      const result = response.safeParse(JSON.parse(cached));

      if (!result.success) {
        diagnose(key, "decode", result.error);

        return null;
      }

      return result.data satisfies TournamentPlayerStatsResponse;
    } catch (error) {
      diagnose(key, "read", error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }
}
