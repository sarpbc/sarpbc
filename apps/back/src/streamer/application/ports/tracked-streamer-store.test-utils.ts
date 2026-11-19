import type { TrackedStreamer } from "../../domain/tracked-streamer";
import type { TrackedStreamerStore } from "./tracked-streamer-store";

export class MemoryTrackedStreamerStore implements TrackedStreamerStore {
  constructor(
    private readonly streamers: TrackedStreamer[],
    private readonly createdAt = new Date("2026-10-31T20:00:00Z"),
  ) {}

  async list() {
    return await Promise.resolve([...this.streamers]);
  }

  async add(login: string, displayName: string | null) {
    if (this.streamers.some((streamer) => streamer.login === login)) {
      return await Promise.resolve(null);
    }

    const streamer = { createdAt: this.createdAt, displayName, id: `${login}-id`, login };
    this.streamers.push(streamer);

    return await Promise.resolve(streamer);
  }

  async remove(id: string) {
    const index = this.streamers.findIndex((streamer) => streamer.id === id);

    if (index === -1) {
      return await Promise.resolve(false);
    }

    this.streamers.splice(index, 1);

    return await Promise.resolve(true);
  }
}
