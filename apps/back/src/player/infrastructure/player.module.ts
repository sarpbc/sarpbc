import { Module } from "@nestjs/common";
import { PlayerController } from "./http/player.controller";
import { PlayerService } from "../application/player.service";
import { ContractService } from "../application/contract.service";
import {
  CONTRACT_REPOSITORY,
  type IContractRepository,
} from "../application/ports/contract.repository.interface";
import {
  PLAYER_PHOTO_REPOSITORY,
  type IPlayerPhotoRepository,
} from "../application/ports/player-photo.repository.interface";
import {
  PLAYER_REPOSITORY,
  type IPlayerRepository,
} from "../application/ports/player.repository.interface";
import {
  TEAM_REPOSITORY,
  type ITeamRepository,
} from "../../team/application/ports/team.repository.interface";
import type { RosterTransaction } from "../application/ports/roster-transaction";
import {
  ROSTER_MERGE_TRANSACTION,
  ROSTER_TRANSACTION,
  RosterPersistenceModule,
} from "./roster-persistence.module";
import type { RosterMergeTransaction } from "../application/ports/roster-merge-transaction";
import { RosterMergeService } from "../application/roster-merge.service";
import { UserModule } from "../../user/infrastructure/user.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";

@Module({
  imports: [RosterPersistenceModule, TournamentModule, UserModule],
  controllers: [PlayerController],
  providers: [
    {
      provide: PlayerService,
      useFactory: (
        players: IPlayerRepository,
        photos: IPlayerPhotoRepository,
        teams: ITeamRepository,
        transaction: RosterTransaction,
      ) => new PlayerService(players, photos, teams, transaction),
      inject: [PLAYER_REPOSITORY, PLAYER_PHOTO_REPOSITORY, TEAM_REPOSITORY, ROSTER_TRANSACTION],
    },
    {
      provide: RosterMergeService,
      useFactory: (transaction: RosterMergeTransaction) => new RosterMergeService(transaction),
      inject: [ROSTER_MERGE_TRANSACTION],
    },
    {
      provide: ContractService,
      useFactory: (
        contracts: IContractRepository,
        players: IPlayerRepository,
        teams: ITeamRepository,
      ) => new ContractService(contracts, players, teams),
      inject: [CONTRACT_REPOSITORY, PLAYER_REPOSITORY, TEAM_REPOSITORY],
    },
  ],
  exports: [PlayerService, ContractService, RosterMergeService, RosterPersistenceModule],
})
export class PlayerModule {}
