import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { log } from "evlog";
import { RedisService } from "../../infrastructure/redis/redis.service";
import type {
  CompetitionCache,
  CompetitionDiagnostics,
  CompetitionEvents,
} from "../application/ports";
import type { MatchDecided } from "../domain/match-decided";
import { tournamentPrizesCacheKey } from "./cache/cached-tournament-prizes.read";
@Injectable()
export class CompetitionCacheAdapter implements CompetitionCache {
  constructor(private readonly redis: RedisService) {}
  async invalidateTournament(id: string) {
    await Promise.all([
      this.redis.delete("tournament:" + id),
      this.redis.delete(tournamentPrizesCacheKey(id)),
    ]);
  }
}
@Injectable()
export class CompetitionEventsAdapter implements CompetitionEvents {
  constructor(private readonly emitter: EventEmitter2) {}
  async publish(event: MatchDecided) {
    await this.emitter.emitAsync(event.type, event);
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
  warn(message, context) {
    log.warn({ component: "Competition", message, ...context });
  },
};
