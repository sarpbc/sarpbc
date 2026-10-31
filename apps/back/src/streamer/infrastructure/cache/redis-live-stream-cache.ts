import { z } from "zod";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type {
  LiveStreamCache,
  LiveStreamSnapshot,
} from "../../application/ports/live-stream-cache";

export const LIVE_STREAMS_KEY = "streamers:live";
export const LIVE_STREAMS_LOCK_KEY = "streamers:live:refresh";
const SNAPSHOT_TTL_SECONDS = 60 * 60;
const LOCK_TTL_SECONDS = 15;

const snapshot = z.object({
  fetchedAt: z.iso.datetime().transform((value) => new Date(value)),
  streams: z.array(
    z.object({
      login: z.string(),
      displayName: z.string(),
      title: z.string(),
      viewerCount: z.number(),
      url: z.string(),
    }),
  ),
});

export class RedisLiveStreamCache implements LiveStreamCache {
  constructor(
    private readonly redis: Pick<RedisService, "get" | "set" | "setIfAbsent" | "delete">,
  ) {}

  async read(): Promise<LiveStreamSnapshot | null> {
    const cached = await this.redis.get(LIVE_STREAMS_KEY);
    if (cached === null) return null;
    const result = snapshot.safeParse(JSON.parse(cached));
    return result.success ? result.data : null;
  }

  async write(value: LiveStreamSnapshot): Promise<void> {
    await this.redis.set(LIVE_STREAMS_KEY, JSON.stringify(value), SNAPSHOT_TTL_SECONDS);
  }

  claimRefresh(): Promise<boolean> {
    return this.redis.setIfAbsent(LIVE_STREAMS_LOCK_KEY, "1", LOCK_TTL_SECONDS);
  }

  async clear(): Promise<void> {
    await this.redis.delete(LIVE_STREAMS_KEY);
    await this.redis.delete(LIVE_STREAMS_LOCK_KEY);
  }
}
