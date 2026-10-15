import { Inject, Injectable } from "@nestjs/common";
import { createLogger } from "evlog";
import {
  PANDASCORE_GATEWAY,
  PandascoreGateway,
  PandascoreIncidentDto,
} from "src/pandascore/application/ports/pandascore.gateway.port";
import { PandascoreIncidentPlayerDto } from "src/pandascore/infrastructure/dto/incident.dto";
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
export class SyncPandascoreIncidentsUseCase {
  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
    @Inject(SYNC_CURSOR_REPOSITORY)
    private readonly syncCursorRepository: SyncCursorRepository,
    private readonly persistence: TournamentSyncPersistence,
  ) {}

  async execute(): Promise<void> {
    const log = createLogger({ component: SyncPandascoreIncidentsUseCase.name });

    try {
      const since = await this.resolveSinceCursor();
      log.set({ since: since.toISOString() });

      const incidents = await this.pandascoreGateway.listIncidents({
        since,
        videogame: [ROCKET_LEAGUE_VIDEOGAME],
        sort: "modified_at",
        perPage: 100,
      });

      if (incidents.length === 0) {
        await this.syncCursorRepository.setLastSyncAt(new Date());
        log.set({ incidents: { total: 0, processed: 0, failed: 0 } });
        return;
      }

      let latestModifiedAt = since;
      let failed = 0;

      for (const incident of incidents) {
        try {
          await this.processIncident(log, incident);
          // Team and player upserts only persist; without this the last one of a run is lost.
          await this.persistence.flush();
        } catch (error) {
          failed += 1;
          log.set({ incidentType: incident.type, incidentId: incident.id });
          log.error(error instanceof Error ? error : new Error(String(error)));
        }

        const modifiedAt = new Date(incident.modified_at);
        if (modifiedAt > latestModifiedAt) {
          latestModifiedAt = modifiedAt;
        }
      }

      await this.syncCursorRepository.setLastSyncAt(latestModifiedAt);
      log.set({
        incidents: {
          total: incidents.length,
          processed: incidents.length - failed,
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

  private async processIncident(
    log: ReturnType<typeof createLogger>,
    incident: PandascoreIncidentDto,
  ): Promise<void> {
    if (incident.change_type === "deletion") {
      log.info(`Skipping ${incident.type} deletion (id=${incident.id})`);
      return;
    }

    switch (incident.type) {
      case "tournament":
        await this.persistence.upsertTournament(
          PandascoreTournamentMapper.toUpsertCommand(incident.object),
        );
        break;
      case "match":
        await this.processMatchIncident(log, incident.object);
        break;
      case "team":
        await this.persistence.upsertTeam(PandascoreTeamMapper.toUpsertCommand(incident.object));
        break;
      case "player":
        await this.processPlayerIncident(incident.object);
        break;
      case "league":
        await this.persistence.upsertLeague(
          PandascoreLeagueMapper.toUpsertCommand(incident.object),
        );
        break;
      case "serie":
        log.info(`Skipping serie incident (id=${incident.id})`);
        break;
      default: {
        const _exhaustive: never = incident;
        log.warn(`Unhandled PandaScore incident type: ${String(_exhaustive)}`);
      }
    }
  }

  private async processPlayerIncident(playerDto: PandascoreIncidentPlayerDto): Promise<void> {
    const team = playerDto.current_team
      ? await this.persistence.upsertTeam(
          PandascoreTeamMapper.fromCurrentTeam(playerDto.current_team),
        )
      : null;
    await this.persistence.upsertPlayer(PandascorePlayerMapper.toUpsertCommand(playerDto), team);
  }

  private async processMatchIncident(
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
          `Skipping match incident because tournament is unknown on PandaScore (matchId=${matchDto.id}, tournamentId=${matchDto.tournament_id})`,
        );
        return;
      }

      await this.persistence.upsertTournament(
        PandascoreTournamentMapper.toUpsertCommand(pandaTournament),
      );
      tournament = await this.persistence.findTournamentByPandascoreId(matchDto.tournament_id);
      if (!tournament) {
        log.warn(
          `Failed to persist tournament for match incident (matchId=${matchDto.id}, tournamentId=${matchDto.tournament_id})`,
        );
        return;
      }

      log.info(
        `Backfilled missing tournament from match incident (tournamentId=${matchDto.tournament_id})`,
      );
    }

    const command = PandascoreMatchMapper.toUpsertCommand(matchDto);
    await this.persistence.upsertMatchesForTournament(tournament, [command]);
  }
}
