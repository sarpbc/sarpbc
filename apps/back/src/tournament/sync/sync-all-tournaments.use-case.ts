import { Inject, Injectable } from "@nestjs/common";
import {
  PANDASCORE_GATEWAY,
  PandascoreGateway,
} from "src/pandascore/application/ports/pandascore.gateway.port";
import { PandascoreTournamentMapper } from "src/pandascore/application/mappers/pandascore-tournament.mapper";
import { createLogger } from "evlog";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

@Injectable()
export class SyncAllTournamentsUseCase {
  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
    private readonly persistence: TournamentSyncPersistence,
  ) {}

  async execute(): Promise<void> {
    const log = createLogger({ component: SyncAllTournamentsUseCase.name });

    try {
      const pandascoreTournaments = await this.pandascoreGateway.getTournaments();
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

      log.set({
        sync: {
          fetched: pandascoreTournaments.length,
          newTournaments: newTournamentsFound,
          participants: participantsCreated,
          skipped: pandascoreTournaments.length - newTournamentsFound,
        },
      });
    } catch (error) {
      log.error(error);
      throw error;
    } finally {
      log.emit();
    }
  }
}
