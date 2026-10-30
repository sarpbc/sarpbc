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
  MikroTeamStore,
} from "./persistence/roster.store";
import { MikroCurrentRosterWriter } from "./persistence/current-roster.writer";
import { UserModule } from "../../user/infrastructure/user.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { PandascoreModule } from "../../pandascore/infrastructure/pandascore.module";
import { PandascoreCurrentRosterSource } from "../../pandascore/infrastructure/pandascore-current-roster-source";
import type { CurrentRosterSource } from "../application/ports";

@Module({
  imports: [
    MikroOrmModule.forFeature([Player, Team, Contract, PlayerPhoto]),
    TournamentModule,
    UserModule,
    PandascoreModule,
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
      useFactory: (em: EntityManager) => new MikroRosterMergeTransaction(em),
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
      useFactory: (
        teams: MikroTeamStore,
        transaction: MikroRosterTransaction,
        sync: SyncPandascoreTeamsUseCase,
      ) => new TeamService(teams, transaction, sync),
      inject: [MikroTeamStore, MikroRosterTransaction, SyncPandascoreTeamsUseCase],
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
  ],
  exports: [PlayerService, TeamService, ContractService, RosterMergeService],
})
export class RosterModule implements OnModuleInit {
  constructor(
    private readonly teamService: TeamService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot")) {
      this.teamService.initializeTeamsFromPandaScore(true).catch((error) => {
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
