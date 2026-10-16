import {
  CURRENT_ROSTER_WRITER,
  ROSTER_TRANSACTION,
  RosterPersistenceModule,
} from "../../player/infrastructure/roster-persistence.module";
import type { RosterTransaction } from "../../player/application/ports/roster-transaction";
import {
  TEAM_REPOSITORY,
  type ITeamRepository,
} from "../application/ports/team.repository.interface";
import { PlayerService } from "../../player/application/player.service";
import {
  PANDASCORE_GATEWAY,
  PandascoreGateway,
} from "../../pandascore/application/ports/pandascore.gateway.port";
import { PandascoreCurrentRosterSource } from "./persistence/current-roster.adapter";
import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TeamController } from "./http/team.controller";
import { TeamService } from "../application/team.service";
import { PlayerModule } from "../../player/infrastructure/player.module";
import { UserModule } from "../../user/infrastructure/user.module";
import { PandascoreModule } from "../../pandascore/infrastructure/pandascore.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import {
  SyncPandascoreTeamsUseCase,
  type CurrentRosterWriter,
} from "../application/sync-pandascore-teams.use-case";
import { log } from "evlog";

@Module({
  imports: [
    RosterPersistenceModule,
    PlayerModule,
    TournamentModule,
    UserModule,
    PandascoreModule,
    ConfigModule,
  ],
  controllers: [TeamController],
  providers: [
    {
      provide: SyncPandascoreTeamsUseCase,
      useFactory: (writer: CurrentRosterWriter, gateway: PandascoreGateway) =>
        new SyncPandascoreTeamsUseCase(writer, new PandascoreCurrentRosterSource(gateway)),
      inject: [CURRENT_ROSTER_WRITER, PANDASCORE_GATEWAY],
    },
    {
      provide: TeamService,
      useFactory: (
        teams: ITeamRepository,
        transaction: RosterTransaction,
        players: PlayerService,
        sync: SyncPandascoreTeamsUseCase,
      ) => new TeamService(teams, transaction, players, sync),
      inject: [TEAM_REPOSITORY, ROSTER_TRANSACTION, PlayerService, SyncPandascoreTeamsUseCase],
    },
  ],
  exports: [TeamService, RosterPersistenceModule],
})
export class TeamModule implements OnModuleInit {
  constructor(
    private readonly teamService: TeamService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot")) {
      this.teamService.initializeTeamsFromPandaScore(true).catch((error) => {
        log.error({
          component: TeamModule.name,
          job: "module_init",
          message: "Failed to initialize teams on module init",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    }
  }
}
