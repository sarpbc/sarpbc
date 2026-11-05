import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { log } from "evlog";
import { UserModule } from "../../user/infrastructure/user.module";
import { MatchGamesService } from "../application/match-games.service";
import { StatsImportService } from "../application/stats-import.service";
import { BallchasingClient } from "./ballchasing/ballchasing-client";
import { StatsImportController } from "./http/stats-import.controller";
import { BoxcarsReplayParser } from "./parser/boxcars-replay-parser";
import { MatchGame, MatchGamePlayer, MatchStatsImport } from "./persistence/match-stats.entities";
import {
  MikroOrmGameStatsStore,
  MikroOrmStatsCandidates,
  MikroOrmStatsImportStore,
} from "./persistence/match-stats.store";
import { StatsImportRunner } from "./stats-import.runner";

@Module({
  imports: [MikroOrmModule.forFeature([MatchGame, MatchGamePlayer, MatchStatsImport]), UserModule],
  controllers: [StatsImportController],
  providers: [
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
          new BoxcarsReplayParser(config.get<string>("replayParser.path") ?? "replay-parser"),
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
