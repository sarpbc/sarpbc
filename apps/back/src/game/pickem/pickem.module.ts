import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PickemChoice } from "./domain/pickem.entity";
import { PickemController } from "./pickem.controller";
import { PickemService } from "./pickem.service";
import { UserModule } from "src/user/user.module";
import { User } from "src/user/domain/user.entity";
import { Match, TournamentParticipant } from "src/tournament/tournament.entities";

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
