import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { RosterMergeService } from "../../roster/application/roster-merge.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { TeamService } from "../../roster/application/team.service";
import { UserService } from "../../user/application/user.service";
import { UserModule } from "../../user/infrastructure/user.module";
import { RosterProposalService } from "../application/roster-proposal.service";
import { RosterProposalController } from "./http/roster-proposal.controller";
import { RosterProposal } from "./persistence/roster-proposal.entity";
import {
  MikroRosterProposalTransaction,
  rosterProposalStore,
} from "./persistence/roster-proposal.store";

@Module({
  imports: [MikroOrmModule.forFeature([RosterProposal]), RosterModule, UserModule],
  controllers: [RosterProposalController],
  providers: [
    {
      provide: RosterProposalService,
      useFactory: (
        em: EntityManager,
        players: PlayerService,
        teams: TeamService,
        contracts: ContractService,
        merges: RosterMergeService,
        users: UserService,
      ) =>
        new RosterProposalService(
          rosterProposalStore(em),
          new MikroRosterProposalTransaction(em),
          players,
          teams,
          contracts,
          merges,
          users,
        ),
      inject: [
        EntityManager,
        PlayerService,
        TeamService,
        ContractService,
        RosterMergeService,
        UserService,
      ],
    },
  ],
  exports: [RosterProposalService],
})
export class RosterProposalModule {}
