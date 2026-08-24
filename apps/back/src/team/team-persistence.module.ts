import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Team } from "../player/player.entities";
import { TeamRepository } from "./team.repository";
import { TEAM_REPOSITORY } from "./domain/team.repository.interface";

@Module({
  imports: [MikroOrmModule.forFeature([Team])],
  providers: [
    {
      provide: TEAM_REPOSITORY,
      useExisting: TeamRepository,
    },
  ],
  exports: [TEAM_REPOSITORY, MikroOrmModule],
})
export class TeamPersistenceModule {}
