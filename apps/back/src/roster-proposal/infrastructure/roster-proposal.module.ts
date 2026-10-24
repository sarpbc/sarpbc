import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ContractService } from "../../player/application/contract.service";
import { PlayerService } from "../../player/application/player.service";
import { RosterMergeService } from "../../player/application/roster-merge.service";
import { PlayerModule } from "../../player/infrastructure/player.module";
import { TeamService } from "../../team/application/team.service";
import { TeamModule } from "../../team/infrastructure/team.module";
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
  imports: [MikroOrmModule.forFeature([RosterProposal]), PlayerModule, TeamModule, UserModule],
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
