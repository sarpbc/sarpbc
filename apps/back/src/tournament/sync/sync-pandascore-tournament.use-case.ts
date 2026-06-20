import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  PANDASCORE_GATEWAY,
  PandascoreGateway,
} from "src/pandascore/application/ports/pandascore.gateway.port";
import { PandascoreMatchMapper } from "src/pandascore/application/mappers/pandascore-match.mapper";
import { PandascoreTournamentMapper } from "src/pandascore/application/mappers/pandascore-tournament.mapper";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

@Injectable()
export class SyncPandascoreTournamentUseCase {
  private readonly logger = new Logger(SyncPandascoreTournamentUseCase.name);

  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
    private readonly persistence: TournamentSyncPersistence,
  ) {}

  async execute(tournamentId: string): Promise<void> {
    this.logger.log(`Syncing tournament ${tournamentId} from PandaScore...`);

    const tournament = await this.persistence.findTournamentById(tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const pandascoreId = tournament.pandascoreId;
    if (!pandascoreId) {
      throw new Error("Tournament does not have a PandaScore ID");
    }

    await this.syncTournamentDetails(pandascoreId);
    await this.syncTournamentMatches(tournamentId, pandascoreId);

    this.logger.log(`Finished syncing tournament ${tournamentId}`);
  }

  private async syncTournamentDetails(pandascoreId: number): Promise<void> {
    const pandaTournament = await this.pandascoreGateway.getTournamentById(pandascoreId);
    if (!pandaTournament) {
      this.logger.warn(`PandaScore tournament ${pandascoreId} not found`);
      return;
    }

    const command = PandascoreTournamentMapper.toUpsertCommand(pandaTournament);
    await this.persistence.upsertTournament(command);

    if (pandaTournament.expected_roster) {
      for (const roster of pandaTournament.expected_roster) {
        const participantCommand = PandascoreTournamentMapper.toParticipantCommand(roster);
        const tournament = await this.persistence.findTournamentByPandascoreId(pandascoreId);
        if (tournament) {
          await this.persistence.upsertTournamentParticipant(tournament, participantCommand);
        }
      }
    }
  }

  private async syncTournamentMatches(tournamentId: string, pandascoreId: number): Promise<number> {
    const tournament = await this.persistence.findTournamentById(tournamentId);
    if (!tournament) {
      this.logger.warn(`Tournament ${tournamentId} not found`);
      return -1;
    }

    const pandaMatches = await this.pandascoreGateway.getTournamentBrackets(pandascoreId);
    const commands = pandaMatches.map((match) => PandascoreMatchMapper.toUpsertCommand(match));
    return this.persistence.upsertMatchesForTournament(tournament, commands);
  }
}
