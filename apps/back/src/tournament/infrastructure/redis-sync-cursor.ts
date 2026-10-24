import type { RedisService } from "../../infrastructure/redis/redis.service";
import type { SyncCursor } from "../application/ports";

export const PANDASCORE_SYNC_CURSOR_KEY = "pandascore:sync:additions:cursor";

export class RedisSyncCursor implements SyncCursor {
  constructor(private readonly redisService: RedisService) {}

  async getLastSyncAt(): Promise<Date | null> {
    const value = await this.redisService.get(PANDASCORE_SYNC_CURSOR_KEY);
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async setLastSyncAt(date: Date): Promise<void> {
    await this.redisService.set(PANDASCORE_SYNC_CURSOR_KEY, date.toISOString(), 60 * 60 * 24 * 30);
  }
}
