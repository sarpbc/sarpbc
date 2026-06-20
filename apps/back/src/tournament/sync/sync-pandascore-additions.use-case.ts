import { Inject, Injectable, Logger } from "@nestjs/common";
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
  private readonly logger = new Logger(SyncPandascoreAdditionsUseCase.name);

  constructor(
    @Inject(PANDASCORE_GATEWAY)
    private readonly pandascoreGateway: PandascoreGateway,
    @Inject(SYNC_CURSOR_REPOSITORY)
    private readonly syncCursorRepository: SyncCursorRepository,
    private readonly persistence: TournamentSyncPersistence,
  ) {}

  async execute(): Promise<void> {
    const since = await this.resolveSinceCursor();
    this.logger.log(`Fetching PandaScore additions since ${since.toISOString()}`);

    const additions = await this.pandascoreGateway.listAdditions({
      since,
      videogame: [ROCKET_LEAGUE_VIDEOGAME],
      sort: "modified_at",
      perPage: 100,
    });

    if (additions.length === 0) {
      this.logger.log("No PandaScore additions found");
      await this.syncCursorRepository.setLastSyncAt(new Date());
      return;
    }

    let latestModifiedAt = since;

    for (const addition of additions) {
      try {
        await this.processAddition(addition);
      } catch (error) {
        this.logger.error(`Failed to process addition ${addition.type}:${addition.id}`, error);
      }

      const modifiedAt = new Date(addition.modified_at);
      if (modifiedAt > latestModifiedAt) {
        latestModifiedAt = modifiedAt;
      }
    }

    await this.syncCursorRepository.setLastSyncAt(latestModifiedAt);
    this.logger.log(`Processed ${additions.length} PandaScore additions`);
  }

  private async resolveSinceCursor(): Promise<Date> {
    const cursor = await this.syncCursorRepository.getLastSyncAt();
    if (cursor) {
      return cursor;
    }
    return new Date(Date.now() - DEFAULT_LOOKBACK_MS);
  }

  private async processAddition(addition: PandascoreAdditionDto): Promise<void> {
    switch (addition.type) {
      case "tournament":
        await this.persistence.upsertTournament(
          PandascoreTournamentMapper.toUpsertCommand(addition.object),
        );
        break;
      case "match":
        await this.processMatchAddition(addition.object);
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
        this.logger.debug(`Skipping serie addition ${addition.id}`);
        break;
      default: {
        const _exhaustive: never = addition;
        this.logger.warn(`Unhandled PandaScore addition type: ${String(_exhaustive)}`);
      }
    }
  }

  private async processMatchAddition(matchDto: MatchDto): Promise<void> {
    const tournament = await this.persistence.findTournamentByPandascoreId(matchDto.tournament_id);
    if (!tournament) {
      this.logger.debug(
        `Skipping match ${matchDto.id}: tournament ${matchDto.tournament_id} not found locally`,
      );
      return;
    }

    const command = PandascoreMatchMapper.toUpsertCommand(matchDto);
    await this.persistence.upsertMatchesForTournament(tournament, [command]);
  }
}
