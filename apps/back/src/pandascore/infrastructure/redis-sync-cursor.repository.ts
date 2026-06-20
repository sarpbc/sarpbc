import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import {
  PANDASCORE_SYNC_CURSOR_KEY,
  SyncCursorRepository,
} from "../domain/sync-cursor.repository.interface";

@Injectable()
export class RedisSyncCursorRepository implements SyncCursorRepository {
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
