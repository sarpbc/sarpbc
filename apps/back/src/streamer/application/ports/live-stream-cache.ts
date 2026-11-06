import type { LiveStreamer } from "@sarpbc/types";

export interface LiveStreamSnapshot {
  streams: LiveStreamer[];
  fetchedAt: Date;
}

export interface LiveStreamCache {
  read(): Promise<LiveStreamSnapshot | null>;
  claimRefresh(): Promise<string | null>;
  write(snapshot: LiveStreamSnapshot, claim: string): Promise<boolean>;
  clear(): Promise<void>;
}
