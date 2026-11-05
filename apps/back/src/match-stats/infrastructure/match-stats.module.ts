import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { log } from "evlog";
import { UserModule } from "../../user/infrastructure/user.module";
import { MatchGamesService } from "../application/match-games.service";
import { StatsImportService } from "../application/stats-import.service";
import { StatsPlayerLinkService } from "../application/stats-player-link.service";
import { BallchasingClient } from "./ballchasing/ballchasing-client";
import { StatsImportController } from "./http/stats-import.controller";
import { StatsPlayerLinkController } from "./http/stats-player-link.controller";
import {
  MatchGame,
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

@Module({
  imports: [
    MikroOrmModule.forFeature([MatchGame, MatchGamePlayer, MatchStatsImport, PlayerPlatformLink]),
    UserModule,
  ],
  controllers: [StatsImportController, StatsPlayerLinkController],
  providers: [
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
      provide: StatsImportService,
      useFactory: (em: EntityManager, config: ConfigService) => {
        const apiKey = config.get<string>("ballchasing.apiKey");
        return new StatsImportService(
          apiKey ? new BallchasingClient(apiKey) : null,
          new MikroOrmStatsCandidates(em),
          new MikroOrmGameStatsStore(em),
          new MikroOrmStatsImportStore(em),
          (error) =>
            log.error({
              component: StatsImportService.name,
              error: error instanceof Error ? error : new Error(String(error)),
            }),
        );
      },
      inject: [EntityManager, ConfigService],
    },
    StatsImportRunner,
  ],
  exports: [MatchGamesService],
})
export class MatchStatsModule {}
