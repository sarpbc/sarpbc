import type { LiveStream } from "../../domain/live-stream";

export interface LiveStreamSnapshot {
  streams: LiveStream[];
  fetchedAt: Date;
}

export interface LiveStreamCache {
  read(): Promise<LiveStreamSnapshot | null>;
  claimRefresh(): Promise<string | null>;
  write(snapshot: LiveStreamSnapshot, claim: string): Promise<boolean>;
  clear(): Promise<void>;
}
