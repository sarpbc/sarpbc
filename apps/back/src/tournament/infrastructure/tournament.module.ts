import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { EntityManager, MikroORM } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { League } from "./persistence/league.entity";
import { Match } from "./persistence/match.entity";
import { Tournament } from "./persistence/tournament.entity";
import { TournamentEvent } from "./persistence/tournament-event.entity";
import { TournamentParticipant } from "./persistence/tournament-participant.entity";
import { PlayerAward } from "./persistence/player-award.entities";
import { TournamentPrize } from "./persistence/tournament-prize.entities";
import { MatchLineupPlayer } from "./persistence/match-lineup.entities";
import { Player, Team } from "../../roster/infrastructure/roster-persistence";
import { TournamentController } from "./http/tournament.controller";
import { MatchController } from "./http/match.controller";
import { EventController } from "./http/event.controller";
import { CompetitionEventQueries } from "./persistence/event.queries";
import { EVENT_QUERIES, TOURNAMENT_QUERIES } from "./competition-queries.tokens";
import { CompetitionAfterCommit } from "../application/after-commit";
import { TournamentCron } from "./jobs/tournament.cron";
import { TournamentSyncRunner } from "./jobs/tournament-sync.runner";
import { ManualTournamentService } from "../application/manual-tournament.service";
import { ManualCatalogService } from "../application/manual-catalog.service";
import { MatchService } from "../application/match/match.service";
import { StreamService } from "../application/stream.service";
import { MatchLineupService } from "../application/match/match-lineup.service";
import { ViewershipService } from "../application/viewership.service";
import { PlayerAwardService } from "../application/player-award.service";
import { TournamentPrizeService } from "../application/tournament-prize.service";
import { CompetitionSyncService } from "../application/sync/competition-sync.service";
import { SyncAllTournamentsUseCase } from "../application/sync/sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../application/sync/sync-pandascore-tournament.use-case";
import { SyncPandascoreIncidentsUseCase } from "../application/sync/sync-pandascore-incidents.use-case";
import { SyncNewTournamentsUseCase } from "../application/sync/sync-new-tournaments.use-case";
import { CompetitionQueries } from "./persistence/competition.queries";
import { MikroOrmCompetitionTransaction } from "./persistence/competition.transaction";
import { CompetitionAwardQueries } from "./persistence/player-award.queries";
import { CompetitionPrizeQueries } from "./persistence/tournament-prize.queries";
import { CompetitionLineupQueries } from "./persistence/match-lineup.queries";
import { CompetitionCacheAdapter } from "./competition-cache.adapter";
import { CompetitionEventsAdapter } from "./competition-events.adapter";
import { competitionDiagnostics } from "./competition-diagnostics";
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
  controllers: [TournamentController, EventController, MatchController],
  exports: [
    TOURNAMENT_QUERIES,
    EVENT_QUERIES,
    SyncPandascoreTournamentUseCase,
    SyncNewTournamentsUseCase,
    ManualTournamentService,
    ManualCatalogService,
    MatchService,
    MatchLineupService,
    StreamService,
    ViewershipService,
    PlayerAwardService,
    TournamentPrizeService,
  ],
  imports: [
    MikroOrmModule.forFeature([
      Tournament,
      TournamentEvent,
      Match,
      TournamentParticipant,
      League,
      PlayerAward,
      TournamentPrize,
      MatchLineupPlayer,
      Player,
      Team,
    ]),
    PandascoreModule,
    RedisModule,
    ConfigModule,
    ReplyModule,
    MatchStatsModule,
  ],
  providers: [
    {
      inject: [EntityManager],
      provide: EVENT_QUERIES,
      useFactory: (em: EntityManager) => new CompetitionEventQueries(em),
    },
    {
      inject: [CompetitionQueries, RedisService],
      provide: CachedTournamentRead,
      useFactory: (reads: CompetitionQueries, redis: RedisService) =>
        new CachedTournamentRead(reads, redis),
    },
    CompetitionCacheAdapter,
    CompetitionEventsAdapter,
    TournamentSyncRunner,
    TournamentCron,
    {
      inject: [EntityManager],
      provide: CompetitionQueries,
      useFactory: (em: EntityManager) => new CompetitionQueries(em),
    },
    { provide: TOURNAMENT_QUERIES, useExisting: CompetitionQueries },
    {
      inject: [EntityManager],
      provide: MikroOrmCompetitionTransaction,
      useFactory: (em: EntityManager) => new MikroOrmCompetitionTransaction(em),
    },
    {
      inject: [EntityManager],
      provide: CompetitionAwardQueries,
      useFactory: (em: EntityManager) => new CompetitionAwardQueries(em),
    },
    {
      inject: [CompetitionCacheAdapter, CompetitionEventsAdapter],
      provide: CompetitionAfterCommit,
      useFactory: (cache: CompetitionCacheAdapter, events: CompetitionEventsAdapter) =>
        new CompetitionAfterCommit(cache, events, competitionDiagnostics),
    },
    {
      inject: [MikroOrmCompetitionTransaction, CompetitionAfterCommit],
      provide: CompetitionSyncService,
      useFactory: (tx: MikroOrmCompetitionTransaction, afterCommit: CompetitionAfterCommit) =>
        new CompetitionSyncService(tx, afterCommit, competitionDiagnostics),
    },
    {
      inject: [RedisService],
      provide: RedisSyncCursor,
      useFactory: (redis: RedisService) => new RedisSyncCursor(redis),
    },
    {
      inject: [PandascoreCompetitionFeed, CompetitionQueries, CompetitionSyncService],
      provide: SyncAllTournamentsUseCase,
      useFactory: (
        feed: CompetitionFeed,
        reads: CompetitionQueries,
        sync: CompetitionSyncService,
      ) => new SyncAllTournamentsUseCase(feed, reads, sync),
    },
    {
      inject: [PandascoreCompetitionFeed, CompetitionQueries, CompetitionSyncService],
      provide: SyncPandascoreTournamentUseCase,
      useFactory: (
        feed: CompetitionFeed,
        reads: CompetitionQueries,
        sync: CompetitionSyncService,
      ) => new SyncPandascoreTournamentUseCase(feed, reads, sync),
    },
    {
      inject: [
        PandascoreCompetitionFeed,
        RedisSyncCursor,
        CompetitionQueries,
        CompetitionSyncService,
      ],
      provide: SyncPandascoreIncidentsUseCase,
      useFactory: (
        feed: CompetitionFeed,
        cursor: SyncCursor,
        reads: CompetitionQueries,
        sync: CompetitionSyncService,
      ) => new SyncPandascoreIncidentsUseCase(feed, cursor, reads, sync, competitionDiagnostics),
    },
    {
      inject: [
        SyncAllTournamentsUseCase,
        SyncPandascoreTournamentUseCase,
        SyncPandascoreIncidentsUseCase,
      ],
      provide: SyncNewTournamentsUseCase,
      useFactory: (
        all: SyncAllTournamentsUseCase,
        details: SyncPandascoreTournamentUseCase,
        incidents: SyncPandascoreIncidentsUseCase,
      ) => new SyncNewTournamentsUseCase(all, details, incidents, competitionDiagnostics),
    },
    {
      inject: [CompetitionQueries, MikroOrmCompetitionTransaction, CompetitionAfterCommit],
      provide: ManualTournamentService,
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new ManualTournamentService(reads, tx, afterCommit),
    },
    {
      inject: [
        CompetitionQueries,
        EVENT_QUERIES,
        MikroOrmCompetitionTransaction,
        CompetitionAfterCommit,
      ],
      provide: ManualCatalogService,
      useFactory: (
        reads: CompetitionQueries,
        events: CompetitionEventQueries,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new ManualCatalogService(reads, events, tx, afterCommit),
    },
    {
      inject: [CompetitionQueries, MikroOrmCompetitionTransaction, CompetitionAfterCommit],
      provide: MatchService,
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new MatchService(reads, tx, afterCommit),
    },
    {
      inject: [EntityManager, CompetitionQueries, MikroOrmCompetitionTransaction],
      provide: MatchLineupService,
      useFactory: (
        em: EntityManager,
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
      ) => new MatchLineupService(new CompetitionLineupQueries(em), reads, tx),
    },
    {
      inject: [MikroOrmCompetitionTransaction, CompetitionAfterCommit],
      provide: StreamService,
      useFactory: (tx: MikroOrmCompetitionTransaction, afterCommit: CompetitionAfterCommit) =>
        new StreamService(tx, afterCommit),
    },
    {
      inject: [MikroOrmCompetitionTransaction],
      provide: ViewershipService,
      useFactory: (tx: MikroOrmCompetitionTransaction) => new ViewershipService(tx),
    },
    {
      inject: [CompetitionAwardQueries, MikroOrmCompetitionTransaction],
      provide: PlayerAwardService,
      useFactory: (reads: CompetitionAwardQueries, tx: MikroOrmCompetitionTransaction) =>
        new PlayerAwardService(reads, tx),
    },
    {
      inject: [EntityManager, MikroOrmCompetitionTransaction, CompetitionAfterCommit],
      provide: TournamentPrizeService,
      useFactory: (
        em: EntityManager,
        tx: MikroOrmCompetitionTransaction,
        afterCommit: CompetitionAfterCommit,
      ) => new TournamentPrizeService(new CompetitionPrizeQueries(em), tx, afterCommit),
    },
    {
      inject: [TournamentPrizeService, RedisService],
      provide: CachedTournamentPrizesRead,
      useFactory: (prizes: TournamentPrizeService, redis: RedisService) =>
        new CachedTournamentPrizesRead(prizes, redis),
    },
  ],
})
export class TournamentModule implements OnModuleInit {
  constructor(
    private readonly syncAll: SyncAllTournamentsUseCase,
    private readonly configService: ConfigService,
    private readonly orm: MikroORM,
  ) {}
  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot") === true) {
      void this.startSync();
    }
  }
  @CreateRequestContext()
  private async startSync() {
    try {
      await this.syncAll.execute();
    } catch (error) {
      competitionDiagnostics.error("Failed to sync tournaments on module init", error);
    }
  }
}
