import type { TrackedStreamer } from "../../domain/tracked-streamer";

export interface TrackedStreamerStore {
  list(): Promise<TrackedStreamer[]>;
  add(login: string, displayName: string | null): Promise<TrackedStreamer | null>;
  remove(id: string): Promise<boolean>;
}
