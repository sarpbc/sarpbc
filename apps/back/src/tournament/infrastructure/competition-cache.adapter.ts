import { Injectable } from "@nestjs/common";
import { RedisService } from "../../infrastructure/redis/redis.service";
import type { CompetitionCache } from "../application/ports";
import { tournamentCacheKey } from "./cache/cached-tournament.read";
import { tournamentPrizesCacheKey } from "./cache/cached-tournament-prizes.read";

@Injectable()
export class CompetitionCacheAdapter implements CompetitionCache {
  constructor(private readonly redis: RedisService) {}
  async invalidateTournament(id: string) {
    await Promise.all([
      this.redis.delete(tournamentCacheKey(id)),
      this.redis.delete(tournamentPrizesCacheKey(id)),
    ]);
  }
}
