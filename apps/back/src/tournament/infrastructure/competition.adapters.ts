import { Injectable } from "@nestjs/common";
import { log } from "evlog";
import { RedisService } from "../../infrastructure/redis/redis.service";
import type { CompetitionCache, CompetitionDiagnostics } from "../application/ports";
@Injectable()
export class CompetitionCacheAdapter implements CompetitionCache {
  constructor(private readonly redis: RedisService) {}
  async invalidateTournament(id: string) {
    await this.redis.delete("tournament:" + id);
  }
}
export const competitionDiagnostics: CompetitionDiagnostics = {
  error(message, error) {
    log.error({
      component: "Competition",
      message,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  },
};
