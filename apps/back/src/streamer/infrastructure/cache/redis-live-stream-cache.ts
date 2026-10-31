import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type {
  LiveStreamCache,
  LiveStreamSnapshot,
} from "../../application/ports/live-stream-cache";

export const LIVE_STREAMS_KEY = "streamers:live";
export const LIVE_STREAMS_LOCK_KEY = "streamers:live:refresh";
export const SNAPSHOT_TTL_SECONDS = 10 * 60;
export const LOCK_TTL_SECONDS = 30;

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
    private readonly redis: Pick<RedisService, "get" | "setIfAbsent" | "setWhileHeld" | "delete">,
  ) {}

  async read(): Promise<LiveStreamSnapshot | null> {
    const cached = await this.redis.get(LIVE_STREAMS_KEY);
    if (cached === null) return null;
    try {
      const result = snapshot.safeParse(JSON.parse(cached));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  async claimRefresh(): Promise<string | null> {
    const claim = randomUUID();
    return (await this.redis.setIfAbsent(LIVE_STREAMS_LOCK_KEY, claim, LOCK_TTL_SECONDS))
      ? claim
      : null;
  }

  write(value: LiveStreamSnapshot, claim: string): Promise<boolean> {
    return this.redis.setWhileHeld(
      LIVE_STREAMS_LOCK_KEY,
      claim,
      LIVE_STREAMS_KEY,
      JSON.stringify(value),
      SNAPSHOT_TTL_SECONDS,
    );
  }

  async clear(): Promise<void> {
    await this.redis.delete(LIVE_STREAMS_KEY);
    await this.redis.delete(LIVE_STREAMS_LOCK_KEY);
  }
}
