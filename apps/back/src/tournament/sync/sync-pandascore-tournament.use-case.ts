import { Inject, Injectable } from "@nestjs/common";
import { createLogger } from "evlog";
import {
  PANDASCORE_GATEWAY,
  PandascoreGateway,
} from "src/pandascore/application/ports/pandascore.gateway.port";
import { PandascoreMatchMapper } from "src/pandascore/application/mappers/pandascore-match.mapper";
import { PandascoreTournamentMapper } from "src/pandascore/application/mappers/pandascore-tournament.mapper";
import { assertPandascoreSyncAllowed } from "../domain/tournament-source";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

@Injectable()
export class SyncPandascoreTournamentUseCase {
  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
    private readonly persistence: TournamentSyncPersistence,
  ) {}

  async execute(tournamentId: string): Promise<void> {
    const log = createLogger({
      component: SyncPandascoreTournamentUseCase.name,
      tournamentId,
    });

    try {
      const tournament = await this.persistence.findTournamentById(tournamentId);
      if (!tournament) {
        throw new Error("Tournament not found");
      }

      assertPandascoreSyncAllowed(tournament.source);

      const pandascoreId = tournament.pandascoreId;
      if (!pandascoreId) {
        throw new Error("Tournament does not have a PandaScore ID");
      }

      log.set({ pandascoreId });

      const { participantsUpserted, hasBracket } = await this.syncTournamentDetails(
        log,
        pandascoreId,
      );
      const matchesCreated = await this.syncTournamentMatches(
        log,
        tournamentId,
        pandascoreId,
        hasBracket,
      );

      log.set({
        sync: {
          participantsUpserted,
          matchesCreated: matchesCreated >= 0 ? matchesCreated : 0,
        },
      });
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      log.emit();
    }
  }

  private async syncTournamentDetails(
    log: ReturnType<typeof createLogger>,
    pandascoreId: number,
  ): Promise<{ participantsUpserted: number; hasBracket: boolean }> {
    const pandaTournament = await this.pandascoreGateway.getTournamentById(pandascoreId);
    if (!pandaTournament) {
      log.warn(`PandaScore tournament not found (pandascoreId=${pandascoreId})`);
      return { participantsUpserted: 0, hasBracket: false };
    }

    const command = PandascoreTournamentMapper.toUpsertCommand(pandaTournament);
    await this.persistence.upsertTournament(command);

    let participantsUpserted = 0;
    if (pandaTournament.expected_roster) {
      for (const roster of pandaTournament.expected_roster) {
        const participantCommand = PandascoreTournamentMapper.toParticipantCommand(roster);
        const tournament = await this.persistence.findTournamentByPandascoreId(pandascoreId);
        if (tournament) {
          await this.persistence.upsertTournamentParticipant(tournament, participantCommand);
          participantsUpserted += 1;
        }
      }
    }

    return { participantsUpserted, hasBracket: command.hasBracket ?? false };
  }

  private async syncTournamentMatches(
    log: ReturnType<typeof createLogger>,
    tournamentId: string,
    pandascoreId: number,
    hasBracket: boolean,
  ): Promise<number> {
    const tournament = await this.persistence.findTournamentById(tournamentId);
    if (!tournament) {
      log.warn(`Tournament not found for match sync (tournamentId=${tournamentId})`);
      return -1;
    }

    const pandaMatches = hasBracket
      ? await this.pandascoreGateway.getTournamentBrackets(pandascoreId)
      : await this.pandascoreGateway.getTournamentMatches(pandascoreId);
    const commands = pandaMatches.map((match) => PandascoreMatchMapper.toUpsertCommand(match));
    return this.persistence.upsertMatchesForTournament(tournament, commands);
  }
}
