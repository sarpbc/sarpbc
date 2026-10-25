import { Injectable } from "@nestjs/common";
import type { ImportedPlayer } from "../../roster/application/imports";
import type { CurrentRosterSource } from "../../roster/application/ports";
import { PandascoreApiClient } from "./pandascore-api.client";
import { currentPlayerSchema } from "./dto/incident.dto";
import { PandascorePlayerMapper } from "./mappers/pandascore-player.mapper";
@Injectable()
export class PandascoreCurrentRosterSource implements CurrentRosterSource {
  constructor(private readonly apiClient: PandascoreApiClient) {}
  async load(): Promise<ImportedPlayer[]> {
    return (await this.apiClient.getRocketLeaguePlayers()).map((v) =>
      PandascorePlayerMapper.toImportedPlayer(currentPlayerSchema.parse(v)),
    );
  }
}
