import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { log } from "evlog";
import { UserModule } from "../../user/infrastructure/user.module";
import { ManualGameService } from "../application/manual-game.service";
import { MatchGamesService } from "../application/match-games.service";
import { StatsImportService } from "../application/stats-import.service";
import { StatsPlayerLinkService } from "../application/stats-player-link.service";
import { BallchasingClient } from "./ballchasing/ballchasing-client";
import { StatsGameController } from "./http/stats-game.controller";
import { StatsImportController } from "./http/stats-import.controller";
import { StatsPlayerLinkController } from "./http/stats-player-link.controller";
import {
  MatchGame,
  MatchGameExclusion,
  MatchGamePlayer,
  MatchStatsImport,
  PlayerPlatformLink,
} from "./persistence/match-stats.entities";
import {
  MikroOrmGameStatsStore,
  MikroOrmPlayerLinkStore,
  MikroOrmStatsCandidates,
  MikroOrmStatsImportStore,
} from "./persistence/match-stats.store";
import { StatsImportRunner } from "./stats-import.runner";

const BALLCHASING_SOURCE = Symbol("BallchasingSource");

@Module({
  imports: [
    MikroOrmModule.forFeature([
      MatchGame,
      MatchGameExclusion,
      MatchGamePlayer,
      MatchStatsImport,
      PlayerPlatformLink,
    ]),
    UserModule,
  ],
  controllers: [StatsImportController, StatsPlayerLinkController, StatsGameController],
  providers: [
    {
      provide: BALLCHASING_SOURCE,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>("ballchasing.apiKey");
        return apiKey ? new BallchasingClient(apiKey) : null;
      },
      inject: [ConfigService],
    },
    {
      provide: StatsPlayerLinkService,
      useFactory: (em: EntityManager) =>
        new StatsPlayerLinkService(
          new MikroOrmStatsCandidates(em),
          new MikroOrmPlayerLinkStore(em),
        ),
      inject: [EntityManager],
    },
    {
      provide: MatchGamesService,
      useFactory: (em: EntityManager) => new MatchGamesService(new MikroOrmGameStatsStore(em)),
      inject: [EntityManager],
    },
    {
      provide: ManualGameService,
      useFactory: (em: EntityManager, source: BallchasingClient | null) =>
        new ManualGameService(
          source,
          new MikroOrmStatsCandidates(em),
          new MikroOrmGameStatsStore(em),
        ),
      inject: [EntityManager, BALLCHASING_SOURCE],
    },
    {
      provide: StatsImportService,
      useFactory: (
        em: EntityManager,
        source: BallchasingClient | null,
        runner: StatsImportRunner,
      ) =>
        new StatsImportService(
          source,
          new MikroOrmStatsCandidates(em),
          new MikroOrmGameStatsStore(em),
          new MikroOrmStatsImportStore(em),
          runner,
          (error) =>
            log.error({
              component: StatsImportService.name,
              error: error instanceof Error ? error : new Error(String(error)),
            }),
        ),
      inject: [EntityManager, BALLCHASING_SOURCE, StatsImportRunner],
    },
    StatsImportRunner,
  ],
  exports: [MatchGamesService, StatsImportService, StatsPlayerLinkService, ManualGameService],
})
export class MatchStatsModule {}
