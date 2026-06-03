import { Module, forwardRef } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PlayerController } from "./player.controller";
import { Player } from "./domain/player.entity";
import { Contract } from "./domain/contract.entity";
import { PlayerPhoto } from "./domain/player-photo.entity";
import { PlayerService } from "./player.service";
import { ContractService } from "./contract.service";
import { TeamModule } from "../team/team.module";
import { UserModule } from "src/user/user.module";
import { TournamentModule } from "src/tournament/tournament.module";

@Module({
  imports: [
    MikroOrmModule.forFeature([Player, Contract, PlayerPhoto]),
    forwardRef(() => TeamModule),
    forwardRef(() => TournamentModule),
    UserModule,
  ],
  controllers: [PlayerController],
  providers: [PlayerService, ContractService],
  exports: [PlayerService, ContractService],
})
export class PlayerModule {}
