import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PLAYER_REPOSITORY } from "../application/ports/player.repository.interface";
import { CONTRACT_REPOSITORY } from "../application/ports/contract.repository.interface";
import { PLAYER_PHOTO_REPOSITORY } from "../application/ports/player-photo.repository.interface";
import { TEAM_REPOSITORY } from "../../team/application/ports/team.repository.interface";
import { Player, Team, Contract, PlayerPhoto } from "./persistence/player.entities";
import {
  rosterStores,
  MikroRosterMergeTransaction,
  MikroRosterTransaction,
} from "./persistence/roster.store";
import { MikroCurrentRosterWriter } from "./persistence/current-roster.writer";

export const ROSTER_TRANSACTION = Symbol("ROSTER_TRANSACTION");
export const CURRENT_ROSTER_WRITER = Symbol("CURRENT_ROSTER_WRITER");
export const ROSTER_MERGE_TRANSACTION = Symbol("ROSTER_MERGE_TRANSACTION");

@Module({
  imports: [MikroOrmModule.forFeature([Player, Team, Contract, PlayerPhoto])],
  providers: [
    {
      provide: PLAYER_REPOSITORY,
      useFactory: (em: EntityManager) => rosterStores(em).players,
      inject: [EntityManager],
    },
    {
      provide: CONTRACT_REPOSITORY,
      useFactory: (em: EntityManager) => rosterStores(em).contracts,
      inject: [EntityManager],
    },
    {
      provide: PLAYER_PHOTO_REPOSITORY,
      useFactory: (em: EntityManager) => rosterStores(em).photos,
      inject: [EntityManager],
    },
    {
      provide: TEAM_REPOSITORY,
      useFactory: (em: EntityManager) => rosterStores(em).teams,
      inject: [EntityManager],
    },
    {
      provide: ROSTER_TRANSACTION,
      useFactory: (em: EntityManager) => new MikroRosterTransaction(em),
      inject: [EntityManager],
    },
    {
      provide: ROSTER_MERGE_TRANSACTION,
      useFactory: (em: EntityManager) => new MikroRosterMergeTransaction(em),
      inject: [EntityManager],
    },
    {
      provide: CURRENT_ROSTER_WRITER,
      useFactory: (em: EntityManager) => new MikroCurrentRosterWriter(em),
      inject: [EntityManager],
    },
  ],
  exports: [
    PLAYER_REPOSITORY,
    CONTRACT_REPOSITORY,
    PLAYER_PHOTO_REPOSITORY,
    TEAM_REPOSITORY,
    ROSTER_TRANSACTION,
    ROSTER_MERGE_TRANSACTION,
    CURRENT_ROSTER_WRITER,
  ],
})
export class RosterPersistenceModule {}
