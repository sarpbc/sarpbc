import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/postgresql";
import { log } from "evlog";
import { PlayerController } from "./http/player.controller";
import { TeamController } from "./http/team.controller";
import { TransferController } from "./http/transfer.controller";
import { PlayerService } from "../application/player.service";
import { TeamService } from "../application/team.service";
import { ContractService } from "../application/contract.service";
import { TransferService } from "../application/transfer.service";
import { RosterMergeService } from "../application/roster-merge.service";
import { SyncPandascoreTeamsUseCase } from "../application/sync-pandascore-teams.use-case";
import { Player, Team, Contract, PlayerPhoto } from "./persistence/player.entities";
import {
  MikroContractStore,
  MikroPhotoStore,
  MikroPlayerStore,
  MikroRosterMergeTransaction,
  MikroRosterTransaction,
  MikroTeamAliasTransaction,
  MikroTeamStore,
} from "./persistence/roster.store";
import { MikroCurrentRosterWriter } from "./persistence/current-roster.writer";
import { MatchStatsRosterReferences } from "../../match-stats/infrastructure/persistence/roster-references.mover";
import { TournamentRosterReferences } from "../../tournament/infrastructure/persistence/roster-references.mover";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { CircuitRosterReferences } from "../../circuit/infrastructure/persistence/roster-references.mover";
import { SeasonRosterReferences } from "../../season/infrastructure/persistence/roster-references.mover";
import { OnThisDayRosterReferences } from "../../on-this-day/infrastructure/persistence/roster-references.mover";
import { SeasonModule } from "../../season/infrastructure/season.module";
import { PandascoreModule } from "../../pandascore/infrastructure/pandascore.module";
import { PandascoreCurrentRosterSource } from "../../pandascore/infrastructure/pandascore-current-roster-source";
import type { CurrentRosterSource } from "../application/ports";
import { TeamLogoService } from "../application/team-logo.service";
import { TeamAliasService } from "../application/team-alias.service";
import { R2Service } from "../../storage/infrastructure/r2.service";
import { StorageModule } from "../../storage/infrastructure/storage.module";
import { HttpsTeamLogoSource } from "./logo/https-team-logo-source";
import { R2TeamLogoStorage } from "./logo/r2-team-logo-storage";
import { SharpTeamLogoImages } from "./logo/sharp-team-logo-images";

@Module({
  imports: [
    MikroOrmModule.forFeature([Player, Team, Contract, PlayerPhoto]),
    TournamentModule,
    SeasonModule,
    PandascoreModule,
    StorageModule,
    ConfigModule,
  ],
  controllers: [PlayerController, TeamController, TransferController],
  providers: [
    {
      provide: MikroPlayerStore,
      useFactory: (em: EntityManager) => new MikroPlayerStore(em),
      inject: [EntityManager],
    },
    {
      provide: MikroTeamStore,
      useFactory: (em: EntityManager) => new MikroTeamStore(em),
      inject: [EntityManager],
    },
    {
      provide: MikroContractStore,
      useFactory: (em: EntityManager) => new MikroContractStore(em),
      inject: [EntityManager],
    },
    {
      provide: MikroPhotoStore,
      useFactory: (em: EntityManager) => new MikroPhotoStore(em),
      inject: [EntityManager],
    },
    {
      provide: MikroRosterTransaction,
      useFactory: (em: EntityManager) => new MikroRosterTransaction(em),
      inject: [EntityManager],
    },
    {
      provide: MikroRosterMergeTransaction,
      useFactory: (em: EntityManager) =>
        new MikroRosterMergeTransaction(em, (tx) => {
          const competition = new TournamentRosterReferences(tx);
          return {
            movers: [
              new MatchStatsRosterReferences(tx),
              new SeasonRosterReferences(tx),
              new CircuitRosterReferences(tx),
              new OnThisDayRosterReferences(tx),
              competition,
            ],
            sharedTournamentIds: (teamId, otherTeamId) =>
              competition.sharedTournamentIds(teamId, otherTeamId),
          };
        }),
      inject: [EntityManager],
    },
    {
      provide: MikroCurrentRosterWriter,
      useFactory: (em: EntityManager) => new MikroCurrentRosterWriter(em),
      inject: [EntityManager],
    },
    {
      provide: SyncPandascoreTeamsUseCase,
      useFactory: (writer: MikroCurrentRosterWriter, source: CurrentRosterSource) =>
        new SyncPandascoreTeamsUseCase(writer, source),
      inject: [MikroCurrentRosterWriter, PandascoreCurrentRosterSource],
    },
    {
      provide: PlayerService,
      useFactory: (
        players: MikroPlayerStore,
        photos: MikroPhotoStore,
        transaction: MikroRosterTransaction,
      ) => new PlayerService(players, photos, transaction),
      inject: [MikroPlayerStore, MikroPhotoStore, MikroRosterTransaction],
    },
    {
      provide: TeamService,
      useFactory: (teams: MikroTeamStore, transaction: MikroRosterTransaction, em: EntityManager) =>
        new TeamService(teams, transaction, new TournamentRosterReferences(em)),
      inject: [MikroTeamStore, MikroRosterTransaction, EntityManager],
    },
    {
      provide: ContractService,
      useFactory: (
        contracts: MikroContractStore,
        teams: MikroTeamStore,
        transaction: MikroRosterTransaction,
      ) => new ContractService(contracts, teams, transaction),
      inject: [MikroContractStore, MikroTeamStore, MikroRosterTransaction],
    },
    {
      provide: TransferService,
      useFactory: (contracts: MikroContractStore) => new TransferService(contracts),
      inject: [MikroContractStore],
    },
    {
      provide: RosterMergeService,
      useFactory: (transaction: MikroRosterMergeTransaction) => new RosterMergeService(transaction),
      inject: [MikroRosterMergeTransaction],
    },
    {
      provide: TeamAliasService,
      useFactory: (em: EntityManager) => new TeamAliasService(new MikroTeamAliasTransaction(em)),
      inject: [EntityManager],
    },
    {
      provide: TeamLogoService,
      useFactory: (storage: R2Service) =>
        new TeamLogoService(
          new HttpsTeamLogoSource(),
          new SharpTeamLogoImages(),
          new R2TeamLogoStorage(storage),
        ),
      inject: [R2Service],
    },
  ],
  exports: [
    PlayerService,
    TransferService,
    TeamService,
    TeamAliasService,
    ContractService,
    RosterMergeService,
    TeamLogoService,
  ],
})
export class RosterModule implements OnModuleInit {
  constructor(
    private readonly syncPandascoreTeams: SyncPandascoreTeamsUseCase,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot")) {
      this.syncPandascoreTeams.seed().catch((error) => {
        log.error({
          component: RosterModule.name,
          job: "module_init",
          message: "Failed to initialize teams on module init",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    }
  }
}
