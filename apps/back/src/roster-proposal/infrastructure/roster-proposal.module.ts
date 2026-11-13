import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { RosterMergeService } from "../../roster/application/roster-merge.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { TeamLogoService } from "../../roster/application/team-logo.service";
import { TeamService } from "../../roster/application/team.service";
import { TeamAliasService } from "../../roster/application/team-alias.service";
import { UserService } from "../../user/application/user.service";
import { UserModule } from "../../user/infrastructure/user.module";
import { PlayerAwardService } from "../../tournament/application/player-award.service";
import { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import { MatchService } from "../../tournament/application/match/match.service";
import { StreamService } from "../../tournament/application/stream.service";
import { MatchLineupService } from "../../tournament/application/match/match-lineup.service";
import { ViewershipService } from "../../tournament/application/viewership.service";
import { CircuitService } from "../../circuit/application/circuit.service";
import { CircuitModule } from "../../circuit/infrastructure/circuit.module";
import { SeasonService } from "../../season/application/season.service";
import { SeasonModule } from "../../season/infrastructure/season.module";
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
    CircuitModule,
    SeasonModule,
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
        viewerships: ViewershipService,
        circuits: CircuitService,
        teamAliases: TeamAliasService,
        seasons: SeasonService,
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
          viewerships,
          circuits,
          teamAliases,
          seasons,
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
        ViewershipService,
        CircuitService,
        TeamAliasService,
        SeasonService,
      ],
    },
  ],
  exports: [RosterProposalService],
})
export class RosterProposalModule {}
