import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { RosterMergeService } from "../../roster/application/roster-merge.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { TeamLogoService } from "../../roster/application/team-logo.service";
import { TeamService } from "../../roster/application/team.service";
import { UserService } from "../../user/application/user.service";
import { UserModule } from "../../user/infrastructure/user.module";
import { PlayerAwardService } from "../../tournament/application/player-award.service";
import { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import { MatchService } from "../../tournament/application/match/match.service";
import { StreamService } from "../../tournament/application/stream.service";
import { MatchLineupService } from "../../tournament/application/match/match-lineup.service";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { RosterProposalService } from "../application/roster-proposal.service";
import { RosterProposalController } from "./http/roster-proposal.controller";
import { RosterProposal } from "./persistence/roster-proposal.entity";
import {
  MikroRosterProposalTransaction,
  rosterProposalStore,
} from "./persistence/roster-proposal.store";

@Module({
  imports: [
    MikroOrmModule.forFeature([RosterProposal]),
    RosterModule,
    UserModule,
    TournamentModule,
  ],
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
        prizes: TournamentPrizeService,
        awards: PlayerAwardService,
        logos: TeamLogoService,
        matches: MatchService,
        streams: StreamService,
        lineups: MatchLineupService,
      ) =>
        new RosterProposalService(
          rosterProposalStore(em),
          new MikroRosterProposalTransaction(em),
          players,
          teams,
          contracts,
          merges,
          users,
          prizes,
          awards,
          logos,
          matches,
          streams,
          lineups,
        ),
      inject: [
        EntityManager,
        PlayerService,
        TeamService,
        ContractService,
        RosterMergeService,
        UserService,
        TournamentPrizeService,
        PlayerAwardService,
        TeamLogoService,
        MatchService,
        StreamService,
        MatchLineupService,
      ],
    },
  ],
  exports: [RosterProposalService],
})
export class RosterProposalModule {}
