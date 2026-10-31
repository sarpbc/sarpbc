import type { LiveStream } from "../../domain/live-stream";

export interface LiveStreamSnapshot {
  streams: LiveStream[];
  fetchedAt: Date;
}

export interface LiveStreamCache {
  read(): Promise<LiveStreamSnapshot | null>;
  write(snapshot: LiveStreamSnapshot): Promise<void>;
  claimRefresh(): Promise<boolean>;
  clear(): Promise<void>;
}
