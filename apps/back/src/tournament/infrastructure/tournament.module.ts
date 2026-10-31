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
import { EventService } from "../application/event.service";
import { CompetitionEventQueries } from "./persistence/event.queries";
import { TournamentCron } from "./jobs/tournament.cron";
import { TournamentService } from "../application/tournament.service";
import { ManualTournamentService } from "../application/manual-tournament.service";
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
  ],
  controllers: [TournamentController, EventController, MatchController],
  providers: [
    {
      provide: EventService,
      useFactory: (em: EntityManager) => new EventService(new CompetitionEventQueries(em)),
      inject: [EntityManager],
    },
    {
      provide: CachedTournamentRead,
      useFactory: (tournaments: TournamentService, redis: RedisService) =>
        new CachedTournamentRead(tournaments, redis),
      inject: [TournamentService, RedisService],
    },
    CompetitionCacheAdapter,
    CompetitionEventsAdapter,
    TournamentCron,
    {
      provide: CompetitionQueries,
      useFactory: (em: EntityManager) => new CompetitionQueries(em),
      inject: [EntityManager],
    },
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
      provide: CompetitionSyncService,
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        cache: CompetitionCacheAdapter,
        events: CompetitionEventsAdapter,
      ) => new CompetitionSyncService(reads, tx, cache, events, competitionDiagnostics),
      inject: [
        CompetitionQueries,
        MikroOrmCompetitionTransaction,
        CompetitionCacheAdapter,
        CompetitionEventsAdapter,
      ],
    },
    {
      provide: RedisSyncCursor,
      useFactory: (redis: RedisService) => new RedisSyncCursor(redis),
      inject: [RedisService],
    },
    {
      provide: SyncAllTournamentsUseCase,
      useFactory: (feed: CompetitionFeed, sync: CompetitionSyncService) =>
        new SyncAllTournamentsUseCase(feed, sync),
      inject: [PandascoreCompetitionFeed, CompetitionSyncService],
    },
    {
      provide: SyncPandascoreTournamentUseCase,
      useFactory: (feed: CompetitionFeed, sync: CompetitionSyncService) =>
        new SyncPandascoreTournamentUseCase(feed, sync),
      inject: [PandascoreCompetitionFeed, CompetitionSyncService],
    },
    {
      provide: SyncPandascoreIncidentsUseCase,
      useFactory: (feed: CompetitionFeed, cursor: SyncCursor, sync: CompetitionSyncService) =>
        new SyncPandascoreIncidentsUseCase(feed, cursor, sync, competitionDiagnostics),
      inject: [PandascoreCompetitionFeed, RedisSyncCursor, CompetitionSyncService],
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
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        all: SyncAllTournamentsUseCase,
        details: SyncPandascoreTournamentUseCase,
        additions: SyncNewTournamentsUseCase,
        cache: CompetitionCacheAdapter,
      ) => new TournamentService(reads, tx, all, details, additions, cache, competitionDiagnostics),
      inject: [
        CompetitionQueries,
        MikroOrmCompetitionTransaction,
        SyncAllTournamentsUseCase,
        SyncPandascoreTournamentUseCase,
        SyncNewTournamentsUseCase,
        CompetitionCacheAdapter,
      ],
    },
    {
      provide: ManualTournamentService,
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        cache: CompetitionCacheAdapter,
      ) => new ManualTournamentService(reads, tx, cache, competitionDiagnostics),
      inject: [CompetitionQueries, MikroOrmCompetitionTransaction, CompetitionCacheAdapter],
    },
    {
      provide: MatchService,
      useFactory: (
        reads: CompetitionQueries,
        tx: MikroOrmCompetitionTransaction,
        events: CompetitionEventsAdapter,
      ) => new MatchService(reads, tx, events, competitionDiagnostics),
      inject: [CompetitionQueries, MikroOrmCompetitionTransaction, CompetitionEventsAdapter],
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
        cache: CompetitionCacheAdapter,
      ) =>
        new TournamentPrizeService(
          new CompetitionPrizeQueries(em),
          tx,
          cache,
          competitionDiagnostics,
        ),
      inject: [EntityManager, MikroOrmCompetitionTransaction, CompetitionCacheAdapter],
    },
    {
      provide: CachedTournamentPrizesRead,
      useFactory: (prizes: TournamentPrizeService, redis: RedisService) =>
        new CachedTournamentPrizesRead(prizes, redis),
      inject: [TournamentPrizeService, RedisService],
    },
  ],
  exports: [
    TournamentService,
    ManualTournamentService,
    MatchService,
    PlayerAwardService,
    TournamentPrizeService,
  ],
})
export class TournamentModule implements OnModuleInit {
  constructor(
    private readonly tournamentService: TournamentService,
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
    await this.tournamentService.syncAllTournaments();
  }
}
