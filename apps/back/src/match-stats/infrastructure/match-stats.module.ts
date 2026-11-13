import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { log } from "evlog";
import { ManualGameService } from "../application/manual-game.service";
import type { GameStatsStore, StatsCandidates } from "../application/ports";
import { StatsImportService } from "../application/stats-import.service";
import { StatsPlayerLinkService } from "../application/stats-player-link.service";
import { TournamentPlayerStatsService } from "../application/tournament-player-stats.service";
import { BallchasingClient } from "./ballchasing/ballchasing-client";
import { GAME_STATS_STORE } from "./game-stats.tokens";
import { InterruptedImportsSweeper } from "./interrupted-imports.sweeper";
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
const STATS_CANDIDATES = Symbol("StatsCandidates");

@Module({
  imports: [
    MikroOrmModule.forFeature([
      MatchGame,
      MatchGameExclusion,
      MatchGamePlayer,
      MatchStatsImport,
      PlayerPlatformLink,
    ]),
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
      provide: STATS_CANDIDATES,
      useFactory: (em: EntityManager) => new MikroOrmStatsCandidates(em),
      inject: [EntityManager],
    },
    {
      provide: GAME_STATS_STORE,
      useFactory: (em: EntityManager) => new MikroOrmGameStatsStore(em),
      inject: [EntityManager],
    },
    {
      provide: TournamentPlayerStatsService,
      useFactory: (games: GameStatsStore) => new TournamentPlayerStatsService(games),
      inject: [GAME_STATS_STORE],
    },
    {
      provide: StatsPlayerLinkService,
      useFactory: (em: EntityManager, candidates: StatsCandidates) =>
        new StatsPlayerLinkService(candidates, new MikroOrmPlayerLinkStore(em)),
      inject: [EntityManager, STATS_CANDIDATES],
    },
    {
      provide: ManualGameService,
      useFactory: (
        source: BallchasingClient | null,
        candidates: StatsCandidates,
        games: GameStatsStore,
      ) => new ManualGameService(source, candidates, games),
      inject: [BALLCHASING_SOURCE, STATS_CANDIDATES, GAME_STATS_STORE],
    },
    {
      provide: StatsImportService,
      useFactory: (
        em: EntityManager,
        source: BallchasingClient | null,
        candidates: StatsCandidates,
        games: GameStatsStore,
        runner: StatsImportRunner,
      ) =>
        new StatsImportService(
          source,
          candidates,
          games,
          new MikroOrmStatsImportStore(em),
          runner,
          (error) =>
            log.error({
              component: StatsImportService.name,
              error: error instanceof Error ? error : new Error(String(error)),
            }),
        ),
      inject: [
        EntityManager,
        BALLCHASING_SOURCE,
        STATS_CANDIDATES,
        GAME_STATS_STORE,
        StatsImportRunner,
      ],
    },
    StatsImportRunner,
    InterruptedImportsSweeper,
  ],
  exports: [
    GAME_STATS_STORE,
    StatsImportService,
    StatsPlayerLinkService,
    ManualGameService,
    TournamentPlayerStatsService,
  ],
})
export class MatchStatsModule {}
