import { NotFoundError } from "../../../common/domain/errors";
import type { CompetitionFeed } from "../feed";
import { assertPandascoreSyncAllowed } from "../../domain/tournament-source";
import type { Tournament } from "../../domain/competition";
import { CompetitionSyncService } from "./competition-sync.service";
export class SyncPandascoreTournamentUseCase {
  constructor(
    private readonly feed: CompetitionFeed,
    private readonly synchronization: CompetitionSyncService,
  ) {}
  async execute(id: string): Promise<void> {
    const tournament = await this.synchronization.findTournamentById(id);
    if (!tournament) throw new NotFoundError("Tournament not found");
    assertPandascoreSyncAllowed(tournament.source);
    if (!tournament.pandascoreId)
      throw new NotFoundError("Tournament does not have a PandaScore ID");
    const command = await this.feed.getTournamentById(tournament.pandascoreId);
    if (!command) return;
    const matches = command.hasBracket
      ? await this.feed.getTournamentBrackets(command.pandascoreId)
      : await this.feed.getTournamentMatches(command.pandascoreId);
    await this.synchronization.upsertTournament(command, matches);
  }
  async executeByPandascoreId(id: number, linkTournamentId?: string): Promise<Tournament> {
    const command = await this.feed.getTournamentById(id);
    if (!command) throw new NotFoundError("PandaScore tournament " + id + " not found");
    const matches = command.hasBracket
      ? await this.feed.getTournamentBrackets(id)
      : await this.feed.getTournamentMatches(id);
    return this.synchronization.upsertTournament(command, matches, linkTournamentId);
  }
}
