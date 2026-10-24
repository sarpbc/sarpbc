import type { CompetitionFeed } from "../feed";
import { CompetitionSyncService } from "./competition-sync.service";
export class SyncAllTournamentsUseCase {
  constructor(
    private readonly feed: CompetitionFeed,
    private readonly synchronization: CompetitionSyncService,
  ) {}
  async execute(): Promise<string[]> {
    const commands = await this.feed.getTournaments(),
      known = await this.synchronization.getKnownTournamentPandascoreIds(),
      ids: string[] = [];
    for (const command of commands) {
      if (known.has(command.pandascoreId)) continue;
      ids.push((await this.synchronization.upsertTournament(command)).id);
      known.add(command.pandascoreId);
    }
    return ids;
  }
}
