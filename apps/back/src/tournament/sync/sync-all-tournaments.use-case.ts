import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  PANDASCORE_GATEWAY,
  PandascoreGateway,
} from "src/pandascore/application/ports/pandascore.gateway.port";
import { PandascoreMatchMapper } from "src/pandascore/application/mappers/pandascore-match.mapper";
import { PandascoreTournamentMapper } from "src/pandascore/application/mappers/pandascore-tournament.mapper";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

@Injectable()
export class SyncAllTournamentsUseCase {
  private readonly logger = new Logger(SyncAllTournamentsUseCase.name);

  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
    private readonly persistence: TournamentSyncPersistence,
  ) {}

  async execute(): Promise<void> {
    this.logger.log("Starting tournament sync from PandaScore...");

    const pandascoreTournaments = await this.pandascoreGateway.getTournaments();
    this.logger.log(`Fetched ${pandascoreTournaments.length} tournaments from PandaScore`);

    const existingPandascoreIds = await this.persistence.getKnownTournamentPandascoreIds();

    let newTournamentsFound = 0;
    let participantsCreated = 0;

    for (const pandaTournament of pandascoreTournaments) {
      if (existingPandascoreIds.has(pandaTournament.id)) {
        continue;
      }

      newTournamentsFound += 1;
      const command = PandascoreTournamentMapper.toUpsertCommand(pandaTournament);
      await this.persistence.upsertTournament(command);

      if (command.expectedRoster) {
        participantsCreated += command.expectedRoster.length;
      }
    }

    this.logger.log(
      `Successfully synced ${newTournamentsFound} new tournaments with ${participantsCreated} participants. Skipped ${pandascoreTournaments.length - newTournamentsFound} existing tournaments.`,
    );
  }
}
