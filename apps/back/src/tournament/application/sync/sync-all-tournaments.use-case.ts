import { mapSequentially } from "../../../common/application/sequentially";
import type { CompetitionFeed } from "../feed";
import type { TournamentQueries } from "../ports";
import { CompetitionSyncService } from "./competition-sync.service";

export class SyncAllTournamentsUseCase {
  constructor(
    private readonly feed: CompetitionFeed,
    private readonly reads: Pick<TournamentQueries, "knownPandascoreIds">,
    private readonly synchronization: CompetitionSyncService,
  ) {}
  async execute(): Promise<string[]> {
    const commands = await this.feed.getTournaments();
    const known = await this.reads.knownPandascoreIds();

    // Each upsert may create the league, serie or event the next one reuses, so run them in order.
    const upserted = await mapSequentially(commands, async (command) => {
      if (known.has(command.pandascoreId)) {
        return null;
      }

      const tournament = await this.synchronization.upsertTournament(command);
      known.add(command.pandascoreId);

      return tournament.id;
    });

    return upserted.filter((id): id is string => id !== null);
  }
}
