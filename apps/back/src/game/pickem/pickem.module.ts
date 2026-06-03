import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PickemChoice } from "./domain/pickem.entity";
import { PickemController } from "./pickem.controller";
import { PickemService } from "./pickem.service";
import { UserModule } from "src/user/user.module";
import { User } from "src/user/domain/user.entity";
import { TournamentParticipant } from "src/tournament/domain/tournament-participant.entity";
import { Match } from "src/tournament/match/match.entity";

@Module({
  imports: [
    MikroOrmModule.forFeature([PickemChoice, User, Match, TournamentParticipant]),
    UserModule,
  ],
  controllers: [PickemController],
  providers: [PickemService],
  exports: [PickemService],
})
export class PickemModule {}
