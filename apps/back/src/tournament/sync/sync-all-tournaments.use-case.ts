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

  async execute(): Promise<string[]> {
    const log = createLogger({ component: SyncAllTournamentsUseCase.name });
    const newTournamentIds: string[] = [];

    try {
      const pandascoreTournaments = await this.pandascoreGateway.getTournaments();
      const existingPandascoreIds = await this.persistence.getKnownTournamentPandascoreIds();

      let participantsCreated = 0;

      for (const pandaTournament of pandascoreTournaments) {
        if (existingPandascoreIds.has(pandaTournament.id)) {
          continue;
        }

        const command = PandascoreTournamentMapper.toUpsertCommand(pandaTournament);
        const tournament = await this.persistence.upsertTournament(command);
        newTournamentIds.push(tournament.id);

        if (command.expectedRoster) {
          participantsCreated += command.expectedRoster.length;
        }
      }

      log.set({
        sync: {
          fetched: pandascoreTournaments.length,
          newTournaments: newTournamentIds.length,
          participants: participantsCreated,
          skipped: pandascoreTournaments.length - newTournamentIds.length,
        },
      });

      return newTournamentIds;
    } catch (error) {
      log.error(error instanceof Error ? error : String(error));
      throw error;
    } finally {
      log.emit();
    }
  }
}
