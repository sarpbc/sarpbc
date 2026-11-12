import { NotFoundError } from "../../../common/domain/errors";
import type { CompetitionFeed, UpsertTournamentCommand } from "../feed";
import type { TournamentQueries } from "../ports";
import { assertPandascoreSyncAllowed } from "../../domain/tournament-source";
import type { Tournament } from "../../domain/competition";
import { CompetitionSyncService } from "./competition-sync.service";
export class SyncPandascoreTournamentUseCase {
  constructor(
    private readonly feed: CompetitionFeed,
    private readonly reads: Pick<TournamentQueries, "findById">,
    private readonly synchronization: CompetitionSyncService,
  ) {}
  async execute(id: string): Promise<void> {
    const tournament = await this.reads.findById(id);
    if (!tournament) throw new NotFoundError("Tournament not found");
    assertPandascoreSyncAllowed(tournament.source);
    if (!tournament.pandascoreId)
      throw new NotFoundError("Tournament does not have a PandaScore ID");
    const command = await this.feed.getTournamentById(tournament.pandascoreId);
    if (command) await this.import(command);
  }
  async executeByPandascoreId(id: number, linkTournamentId?: string): Promise<Tournament> {
    const command = await this.feed.getTournamentById(id);
    if (!command) throw new NotFoundError("PandaScore tournament " + id + " not found");
    return this.import(command, linkTournamentId);
  }
  private async import(
    command: UpsertTournamentCommand,
    linkTournamentId?: string,
  ): Promise<Tournament> {
    const matches = command.hasBracket
      ? await this.feed.getTournamentBrackets(command.pandascoreId)
      : await this.feed.getTournamentMatches(command.pandascoreId);
    const standings = await this.feed.getTournamentStandings(command.pandascoreId);
    return this.synchronization.upsertTournament(
      standings ? { ...command, standings } : command,
      matches,
      linkTournamentId,
    );
  }
}
