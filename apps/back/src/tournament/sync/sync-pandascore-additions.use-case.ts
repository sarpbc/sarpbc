import { Inject, Injectable } from "@nestjs/common";
import { createLogger } from "evlog";
import {
  PANDASCORE_GATEWAY,
  PandascoreAdditionDto,
  PandascoreGateway,
} from "src/pandascore/application/ports/pandascore.gateway.port";
import { PandascoreMatchMapper } from "src/pandascore/application/mappers/pandascore-match.mapper";
import { PandascoreTournamentMapper } from "src/pandascore/application/mappers/pandascore-tournament.mapper";
import { PandascoreTeamMapper } from "src/pandascore/application/mappers/pandascore-team.mapper";
import { PandascorePlayerMapper } from "src/pandascore/application/mappers/pandascore-player.mapper";
import { PandascoreLeagueMapper } from "src/pandascore/application/mappers/pandascore-league.mapper";
import { MatchDto } from "src/pandascore/infrastructure/dto/match.dto";
import {
  SYNC_CURSOR_REPOSITORY,
  SyncCursorRepository,
} from "src/pandascore/domain/sync-cursor.repository.interface";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

const ROCKET_LEAGUE_VIDEOGAME = "rl";
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SyncPandascoreAdditionsUseCase {
  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
    @Inject(SYNC_CURSOR_REPOSITORY)
    private readonly syncCursorRepository: SyncCursorRepository,
    private readonly persistence: TournamentSyncPersistence,
  ) {}

  async execute(): Promise<void> {
    const log = createLogger({ component: SyncPandascoreAdditionsUseCase.name });

    try {
      const since = await this.resolveSinceCursor();
      log.set({ since: since.toISOString() });

      const additions = await this.pandascoreGateway.listAdditions({
        since,
        videogame: [ROCKET_LEAGUE_VIDEOGAME],
        sort: "modified_at",
        perPage: 100,
      });

      if (additions.length === 0) {
        await this.syncCursorRepository.setLastSyncAt(new Date());
        log.set({ additions: { total: 0, processed: 0, failed: 0 } });
        return;
      }

      let latestModifiedAt = since;
      let failed = 0;

      for (const addition of additions) {
        try {
          await this.processAddition(log, addition);
        } catch (error) {
          failed += 1;
          log.set({ additionType: addition.type, additionId: addition.id });
          log.error(error instanceof Error ? error : new Error(String(error)));
        }

        const modifiedAt = new Date(addition.modified_at);
        if (modifiedAt > latestModifiedAt) {
          latestModifiedAt = modifiedAt;
        }
      }

      await this.syncCursorRepository.setLastSyncAt(latestModifiedAt);
      log.set({
        additions: {
          total: additions.length,
          processed: additions.length - failed,
          failed,
        },
      });
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      log.emit();
    }
  }

  private async resolveSinceCursor(): Promise<Date> {
    const cursor = await this.syncCursorRepository.getLastSyncAt();
    if (cursor) {
      return cursor;
    }
    return new Date(Date.now() - DEFAULT_LOOKBACK_MS);
  }

  private async processAddition(
    log: ReturnType<typeof createLogger>,
    addition: PandascoreAdditionDto,
  ): Promise<void> {
    switch (addition.type) {
      case "tournament":
        await this.persistence.upsertTournament(
          PandascoreTournamentMapper.toUpsertCommand(addition.object),
        );
        break;
      case "match":
        await this.processMatchAddition(log, addition.object);
        break;
      case "team":
        await this.persistence.upsertTeam(PandascoreTeamMapper.toUpsertCommand(addition.object));
        break;
      case "player":
        await this.persistence.upsertPlayer(
          PandascorePlayerMapper.toUpsertCommand(addition.object),
        );
        break;
      case "league":
        await this.persistence.upsertLeague(
          PandascoreLeagueMapper.toUpsertCommand(addition.object),
        );
        break;
      case "serie":
        log.info(`Skipping serie addition (id=${addition.id})`);
        break;
      default: {
        const _exhaustive: never = addition;
        log.warn(`Unhandled PandaScore addition type: ${String(_exhaustive)}`);
      }
    }
  }

  private async processMatchAddition(
    log: ReturnType<typeof createLogger>,
    matchDto: MatchDto,
  ): Promise<void> {
    let tournament = await this.persistence.findTournamentByPandascoreId(matchDto.tournament_id);
    if (!tournament) {
      const pandaTournament = await this.pandascoreGateway.getTournamentById(
        matchDto.tournament_id,
      );
      if (!pandaTournament) {
        log.info(
          `Skipping match addition because tournament is unknown on PandaScore (matchId=${matchDto.id}, tournamentId=${matchDto.tournament_id})`,
        );
        return;
      }

      await this.persistence.upsertTournament(
        PandascoreTournamentMapper.toUpsertCommand(pandaTournament),
      );
      tournament = await this.persistence.findTournamentByPandascoreId(matchDto.tournament_id);
      if (!tournament) {
        log.warn(
          `Failed to persist tournament for match addition (matchId=${matchDto.id}, tournamentId=${matchDto.tournament_id})`,
        );
        return;
      }

      log.info(
        `Backfilled missing tournament from match addition (tournamentId=${matchDto.tournament_id})`,
      );
    }

    const command = PandascoreMatchMapper.toUpsertCommand(matchDto);
    await this.persistence.upsertMatchesForTournament(tournament, [command]);
  }
}
