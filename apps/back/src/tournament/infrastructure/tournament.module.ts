import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { EntityManager, MikroORM } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import {
  League,
  Match,
  Tournament,
  TournamentEvent,
  TournamentParticipant,
} from "./persistence/tournament.entities";
import { PlayerAward } from "./persistence/player-award.entities";
import { TournamentPrize } from "./persistence/tournament-prize.entities";
import { Player, Team } from "../../roster/infrastructure/roster-persistence";
import { TournamentController } from "./http/tournament.controller";
import { MatchController } from "./http/match.controller";
import { EventController } from "./http/event.controller";
import { CompetitionEventQueries } from "./persistence/event.queries";
import { EVENT_QUERIES, TOURNAMENT_QUERIES } from "./competition-queries.tokens";
import { CompetitionAfterCommit } from "../application/after-commit";
import { TournamentCron } from "./jobs/tournament.cron";
import { TournamentService } from "../application/tournament.service";
import { ManualTournamentService } from "../application/manual-tournament.service";
import { ManualCatalogService } from "../application/manual-catalog.service";
import { MatchService } from "../application/match/match.service";
import { PlayerAwardService } from "../application/player-award.service";
import { TournamentPrizeService } from "../application/tournament-prize.service";
import { CompetitionSyncService } from "../application/sync/competition-sync.service";
import { SyncAllTournamentsUseCase } from "../application/sync/sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../application/sync/sync-pandascore-tournament.use-case";
import { SyncPandascoreIncidentsUseCase } from "../application/sync/sync-pandascore-incidents.use-case";
import { SyncNewTournamentsUseCase } from "../application/sync/sync-new-tournaments.use-case";
import { CompetitionQueries } from "./persistence/competition.queries";
import { MikroOrmCompetitionTransaction } from "./persistence/competition.transaction";
import { CompetitionAwardQueries } from "./persistence/player-award.store";
import { CompetitionPrizeQueries } from "./persistence/tournament-prize.store";
import {
  CompetitionCacheAdapter,
  CompetitionEventsAdapter,
  competitionDiagnostics,
} from "./competition.adapters";
import { UserModule } from "../../user/infrastructure/user.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { PandascoreModule } from "../../pandascore/infrastructure/pandascore.module";
import { PandascoreCompetitionFeed } from "../../pandascore/infrastructure/pandascore-competition-feed";
import { RedisSyncCursor } from "./redis-sync-cursor";
import type { CompetitionFeed } from "../application/feed";
import type { SyncCursor } from "../application/ports";
import { ReplyModule } from "../../reply/infrastructure/reply.module";
import { MatchStatsModule } from "../../match-stats/infrastructure/match-stats.module";
import { CachedTournamentRead } from "./cache/cached-tournament.read";
import { CachedTournamentPrizesRead } from "./cache/cached-tournament-prizes.read";
import { RedisService } from "../../infrastructure/redis/redis.service";
@Module({
  imports: [
    MikroOrmModule.forFeature([
      Tournament,
      TournamentEvent,
      Match,
      TournamentParticipant,
      League,
      PlayerAward,
      TournamentPrize,
      Player,
      Team,
    ]),
    UserModule,
    PandascoreModule,
    RedisModule,
    ConfigModule,
    ReplyModule,
    MatchStatsModule,
  ],
  controllers: [TournamentController, EventController, MatchController],
  providers: [
    {
      provide: EVENT_QUERIES,
      useFactory: (em: EntityManager) => new CompetitionEventQueries(em),
      inject: [EntityManager],
    },
    {
      provide: CachedTournamentRead,
      useFactory: (reads: CompetitionQueries, redis: RedisService) =>
        new CachedTournamentRead(reads, redis),
      inject: [CompetitionQueries, RedisService],
    },
    CompetitionCacheAdapter,
    CompetitionEventsAdapter,
    TournamentCron,
    {
      provide: CompetitionQueries,
      useFactory: (em: EntityManager) => new CompetitionQueries(em),
      inject: [EntityManager],
    },
    { provide: TOURNAMENT_QUERIES, useExisting: CompetitionQueries },
    {
      provide: MikroOrmCompetitionTransaction,
      useFactory: (em: EntityManager) => new MikroOrmCompetitionTransaction(em),
      inject: [EntityManager],
    },
    {
      provide: CompetitionAwardQueries,
      useFactory: (em: EntityManager) => new CompetitionAwardQueries(em),
      inject: [EntityManager],
    },
    {
      provide: CompetitionAfterCommit,
      useFactory: (cache: CompetitionCacheAdapter, events: CompetitionEventsAdapter) =>
        new CompetitionAfterCommit(cache, events, competitionDiagnostics),
      inject: [CompetitionCacheAdapter, CompetitionEventsAdapter],
    },
    {
      provide: CompetitionSyncService,
      useFactory: (tx: MikroOrmCompetitionTransaction, afterCommit: CompetitionAfterCommit) =>
        new CompetitionSyncService(tx, afterCommit, competitionDiagnostics),
      inject: [MikroOrmCompetitionTransaction, CompetitionAfterCommit],
    },
    {
      provide: RedisSyncCursor,
      useFactory: (redis: RedisService) => new RedisSyncCursor(redis),
      inject: [RedisService],
    },
    {
      provide: SyncAllTournamentsUseCase,
      useFactory: (
        feed: CompetitionFeed,
        reads: CompetitionQueries,
        sync: CompetitionSyncService,
      ) => new SyncAllTournamentsUseCase(feed, reads, sync),
      inject: [PandascoreCompetitionFeed, CompetitionQueries, CompetitionSyncService],
    },
    {
      provide: SyncPandascoreTournamentUseCase,
      useFactory: (
        feed: CompetitionFeed,
        reads: CompetitionQueries,
        sync: CompetitionSyncService,
      ) => new SyncPandascoreTournamentUseCase(feed, reads, sync),
      inject: [PandascoreCompetitionFeed, CompetitionQueries, CompetitionSyncService],
    },
    {
      provide: SyncPandascoreIncidentsUseCase,
      useFactory: (
        feed: CompetitionFeed,
        cursor: SyncCursor,
        reads: CompetitionQueries,
        sync: CompetitionSyncService,
      ) => new SyncPandascoreIncidentsUseCase(feed, cursor, reads, sync, competitionDiagnostics),
      inject: [
        PandascoreCompetitionFeed,
        RedisSyncCursor,
        CompetitionQueries,
        CompetitionSyncService,
      ],
    },
    {
      provide: SyncNewTournamentsUseCase,
      useFactory: (
        all: SyncAllTournamentsUseCase,
        details: SyncPandascoreTournamentUseCase,
        incidents: SyncPandascoreIncidentsUseCase,
      ) => new SyncNewTournamentsUseCase(all, details, incidents, competitionDiagnostics),
      inject: [
        SyncAllTournamentsUseCase,
        SyncPandascoreTournamentUseCase,
        SyncPandascoreIncidentsUseCase,
      ],
    },
    {
      provide: TournamentService,
      useFactory: (reads: CompetitionQueries) => new TournamentService(reads),
      inject: [CompetitionQueries],
    },
    {
      provide: ManualTournamentService,
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new ManualTournamentService(reads, tx, afterCommit),
      inject: [CompetitionQueries, MikroOrmCompetitionTransaction, CompetitionAfterCommit],
    },
    {
      provide: ManualCatalogService,
      useFactory: (
        reads: CompetitionQueries,
        events: CompetitionEventQueries,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new ManualCatalogService(reads, events, tx, afterCommit),
      inject: [
        CompetitionQueries,
        EVENT_QUERIES,
        MikroOrmCompetitionTransaction,
        CompetitionAfterCommit,
      ],
    },
    {
      provide: MatchService,
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new MatchService(reads, tx, afterCommit),
      inject: [CompetitionQueries, MikroOrmCompetitionTransaction, CompetitionAfterCommit],
    },
    {
      provide: PlayerAwardService,
      useFactory: (reads: CompetitionAwardQueries, tx: MikroOrmCompetitionTransaction) =>
        new PlayerAwardService(reads, tx),
      inject: [CompetitionAwardQueries, MikroOrmCompetitionTransaction],
    },
    {
      provide: TournamentPrizeService,
      useFactory: (
        em: EntityManager,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new TournamentPrizeService(new CompetitionPrizeQueries(em), tx, afterCommit),
      inject: [EntityManager, MikroOrmCompetitionTransaction, CompetitionAfterCommit],
    },
    {
      provide: CachedTournamentPrizesRead,
      useFactory: (prizes: TournamentPrizeService, redis: RedisService) =>
        new CachedTournamentPrizesRead(prizes, redis),
      inject: [TournamentPrizeService, RedisService],
    },
  ],
  exports: [
    TOURNAMENT_QUERIES,
    EVENT_QUERIES,
    TournamentService,
    SyncPandascoreTournamentUseCase,
    SyncNewTournamentsUseCase,
    ManualTournamentService,
    ManualCatalogService,
    MatchService,
    PlayerAwardService,
    TournamentPrizeService,
  ],
})
export class TournamentModule implements OnModuleInit {
  constructor(
    private readonly syncAll: SyncAllTournamentsUseCase,
    private readonly configService: ConfigService,
    private readonly orm: MikroORM,
  ) {}
  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot"))
      this.startSync().catch((error) =>
        competitionDiagnostics.error("Failed to sync tournaments on module init", error),
      );
  }
  @CreateRequestContext()
  private async startSync() {
    await this.syncAll.execute();
  }
}
