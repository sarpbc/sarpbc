import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { isUniqueViolation } from "../../../common/infrastructure/persistence/constraint-violation";
import type { TrackedStreamerStore } from "../../application/ports/tracked-streamer-store";
import { TwitchStreamer } from "./twitch-streamer.entity";

const detached = (streamer: TwitchStreamer) => ({
  createdAt: streamer.createdAt,
  displayName: streamer.displayName,
  id: streamer.id,
  login: streamer.login,
});

@Injectable()
export class TwitchStreamerRepository implements TrackedStreamerStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const streamers = await this.em.find(TwitchStreamer, {}, { orderBy: { login: "ASC" } });

    return streamers.map(detached);
  }

  async add(login: string, displayName: string | null) {
    const streamer = new TwitchStreamer();
    streamer.login = login;
    streamer.displayName = displayName;

    try {
      await this.em.persist(streamer).flush();
    } catch (error) {
      if (isUniqueViolation(error)) {
        this.em.clear();

        return null;
      }

      throw error;
    }

    return detached(streamer);
  }

  async remove(id: string) {
    return (await this.em.nativeDelete(TwitchStreamer, { id })) > 0;
  }
}
