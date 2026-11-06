import type { RedisService } from "../../infrastructure/redis/redis.service";
import type { SyncCursor } from "../application/ports";

const CURSOR_KEY = "pandascore:sync:incidents:cursor";
const CURSOR_TTL_SECONDS = 60 * 60 * 24 * 365;

export class RedisSyncCursor implements SyncCursor {
  constructor(private readonly redisService: RedisService) {}

  async getLastSyncAt(): Promise<Date | null> {
    const value = await this.redisService.get(CURSOR_KEY);
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async setLastSyncAt(date: Date): Promise<void> {
    await this.redisService.set(CURSOR_KEY, date.toISOString(), CURSOR_TTL_SECONDS);
  }
}
