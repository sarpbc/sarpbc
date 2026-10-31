import { twitchChannelUrl } from "@sarpbc/utils";
import { ConflictError, NotFoundError } from "../../common/domain/errors";
import { byViewerCount, type LiveStream } from "../domain/live-stream";
import type { TrackedStreamer } from "../domain/tracked-streamer";
import type { LiveStreamCache, LiveStreamSnapshot } from "./ports/live-stream-cache";
import type { LiveStreamSource } from "./ports/live-stream-source";
import type { TrackedStreamerStore } from "./ports/tracked-streamer-store";

export const LIVE_STREAMS_FRESH_MS = 90_000;

export type StreamerFailureReporter = (operation: string, error: unknown) => void;

export class StreamerService {
  constructor(
    private readonly streamers: TrackedStreamerStore,
    private readonly source: LiveStreamSource | null,
    private readonly cache: LiveStreamCache,
    private readonly reportFailure: StreamerFailureReporter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(): Promise<TrackedStreamer[]> {
    return this.streamers.list();
  }

  async add(login: string, displayName: string | null): Promise<TrackedStreamer> {
    const created = await this.streamers.add(login, displayName);
    if (!created) {
      throw new ConflictError(`The Twitch channel "${login}" is already tracked.`);
    }
    await this.invalidate();
    return created;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.streamers.remove(id))) {
      throw new NotFoundError("Streamer not found. It may already have been removed.");
    }
    await this.invalidate();
  }

  async listLive(): Promise<LiveStream[]> {
    if (!this.source) return [];

    let snapshot: LiveStreamSnapshot | null;
    try {
      snapshot = await this.cache.read();
      if (snapshot && this.isFresh(snapshot)) return snapshot.streams;
      if (!(await this.cache.claimRefresh())) return snapshot?.streams ?? [];
    } catch (error) {
      this.reportFailure("cache", error);
      return [];
    }

    let streams: LiveStream[];
    try {
      streams = await this.fetchLive(this.source);
    } catch (error) {
      this.reportFailure("fetch", error);
      return snapshot?.streams ?? [];
    }

    try {
      await this.cache.write({ streams, fetchedAt: this.now() });
    } catch (error) {
      this.reportFailure("cache", error);
    }
    return streams;
  }

  private async fetchLive(source: LiveStreamSource): Promise<LiveStream[]> {
    const tracked = await this.streamers.list();
    if (tracked.length === 0) return [];

    const names = new Map(tracked.map((streamer) => [streamer.login, streamer.displayName]));
    const live = await source.findLiveRocketLeague([...names.keys()]);
    return byViewerCount(
      live.map((stream) => ({
        login: stream.login,
        displayName: names.get(stream.login) ?? stream.displayName,
        title: stream.title,
        viewerCount: stream.viewerCount,
        url: twitchChannelUrl(stream.login),
      })),
    );
  }

  private isFresh(snapshot: LiveStreamSnapshot): boolean {
    return this.now().getTime() - snapshot.fetchedAt.getTime() < LIVE_STREAMS_FRESH_MS;
  }

  private async invalidate(): Promise<void> {
    try {
      await this.cache.clear();
    } catch (error) {
      this.reportFailure("cache", error);
    }
  }
}
