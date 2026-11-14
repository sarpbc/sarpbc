import { Injectable } from "@nestjs/common";
import type { ImportedPlayer } from "../../roster/application/imports";
import type { CurrentRosterSource } from "../../roster/application/ports";
import { PandascoreApiClient } from "./pandascore-api.client";
import { currentPlayerSchema } from "./dto/incident.dto";
import { toImportedPlayer } from "./mappers/pandascore-player.mapper";

@Injectable()
export class PandascoreCurrentRosterSource implements CurrentRosterSource {
  constructor(private readonly apiClient: PandascoreApiClient) {}
  async load(): Promise<ImportedPlayer[]> {
    const players = await this.apiClient.getRocketLeaguePlayers();

    return players.map((v) => toImportedPlayer(currentPlayerSchema.parse(v)));
  }
}
