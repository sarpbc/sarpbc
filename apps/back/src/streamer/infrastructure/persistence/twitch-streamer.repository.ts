import { Injectable } from "@nestjs/common";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import type { TrackedStreamerStore } from "../../application/ports/tracked-streamer-store";
import type { TrackedStreamer } from "../../domain/tracked-streamer";
import { TwitchStreamer } from "./twitch-streamer.entity";

function detached(streamer: TwitchStreamer): TrackedStreamer {
  return {
    id: streamer.id,
    login: streamer.login,
    displayName: streamer.displayName,
    createdAt: streamer.createdAt,
  };
}

@Injectable()
export class TwitchStreamerRepository implements TrackedStreamerStore {
  constructor(private readonly em: EntityManager) {}

  async list(): Promise<TrackedStreamer[]> {
    const streamers = await this.em.find(TwitchStreamer, {}, { orderBy: { login: "ASC" } });
    return streamers.map(detached);
  }

  async add(login: string, displayName: string | null): Promise<TrackedStreamer | null> {
    const streamer = new TwitchStreamer();
    streamer.login = login;
    streamer.displayName = displayName;
    try {
      await this.em.persist(streamer).flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        this.em.clear();
        return null;
      }
      throw error;
    }
    return detached(streamer);
  }

  async remove(id: string): Promise<boolean> {
    return (await this.em.nativeDelete(TwitchStreamer, { id })) > 0;
  }
}
