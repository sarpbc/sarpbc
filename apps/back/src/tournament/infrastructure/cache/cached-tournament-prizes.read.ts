import { log } from "evlog";
import { z } from "zod";
import type { TournamentPrizes } from "@sarpbc/types";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentPrizeService } from "../../application/tournament-prize.service";
import { DATA_SOURCES } from "@sarpbc/types";

const nullableText = z.string().nullable();

const distribution = z.object({
  prizepool: nullableText,
  prizes: z.array(
    z.object({
      amount: z.number(),
      currency: z.string(),
      id: z.string(),
      placement: z.number().int(),
      players: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
      sourceUrl: nullableText,
      team: z.object({
        darkModeImageUrl: nullableText,
        id: z.string(),
        imageUrl: nullableText,
        name: z.string(),
        slug: z.string(),
      }),
    }),
  ),
  source: z.enum(DATA_SOURCES),
}) satisfies z.ZodType<TournamentPrizes>;

export const tournamentPrizesCacheKey = (id: string): string => `tournament-prizes:${id}`;

const diagnose = (key: string, operation: string, error: Error): void => {
  log.warn({
    component: "CachedTournamentPrizesRead",
    error,
    key,
    message: "Optional tournament prizes cache failed",
    operation,
  });
};

export class CachedTournamentPrizesRead {
  constructor(
    private readonly prizes: Pick<TournamentPrizeService, "findByTournamentId">,
    private readonly redis: Pick<RedisService, "get" | "set">,
  ) {}

  async findByTournamentId(id: string): Promise<TournamentPrizes> {
    const key = tournamentPrizesCacheKey(id);
    const cached = await this.readCached(key);

    if (cached) {
      return cached;
    }

    const prizes = await this.prizes.findByTournamentId(id);

    try {
      await this.redis.set(key, JSON.stringify(prizes), 60);
    } catch (error) {
      diagnose(key, "write", error instanceof Error ? error : new Error(String(error)));
    }

    return prizes;
  }

  private async readCached(key: string): Promise<TournamentPrizes | null> {
    try {
      const cached = await this.redis.get(key);

      if (cached === null) {
        return null;
      }

      const decoded: unknown = JSON.parse(cached);
      const result = distribution.safeParse(decoded);

      if (!result.success) {
        diagnose(key, "decode", result.error);

        return null;
      }

      return result.data;
    } catch (error) {
      diagnose(key, "read", error instanceof Error ? error : new Error(String(error)));

      return null;
    }
  }
}
