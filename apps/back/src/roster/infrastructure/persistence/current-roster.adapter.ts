import type { CurrentRoster, CurrentRosterSource } from "../../application/ports";
import type { PandascoreGateway } from "../../../pandascore/application/ports/pandascore.gateway.port";

export class PandascoreCurrentRosterSource implements CurrentRosterSource {
  constructor(private readonly gateway: PandascoreGateway) {}

  async load(): Promise<CurrentRoster[]> {
    return (await this.gateway.getRocketLeaguePlayers()).map((entry) => ({
      player: entry.player,
      team: entry.currentTeam,
    }));
  }
}
