import { Module, forwardRef } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PlayerController } from "./player.controller";
import { Player, Contract, PlayerPhoto } from "./player.entities";
import { PlayerService } from "./player.service";
import { ContractService } from "./contract.service";
import { PlayerAwardService } from "./player-award.service";
import { PlayerRepository } from "./player.repository";
import { ContractRepository } from "./contract.repository";
import { PlayerPhotoRepository } from "./player-photo.repository";
import { CONTRACT_REPOSITORY } from "./domain/contract.repository.interface";
import { PLAYER_PHOTO_REPOSITORY } from "./domain/player-photo.repository.interface";
import { PLAYER_REPOSITORY } from "./domain/player.repository.interface";
import { TeamModule } from "../team/team.module";
import { UserModule } from "src/user/user.module";
import { TournamentModule } from "src/tournament/tournament.module";
import { PlayerAward } from "src/tournament/player-award.entities";
import { Tournament, TournamentParticipant } from "src/tournament/tournament.entities";

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Player,
      Contract,
      PlayerPhoto,
      PlayerAward,
      Tournament,
      TournamentParticipant,
    ]),
    forwardRef(() => TeamModule),
    forwardRef(() => TournamentModule),
    UserModule,
  ],
  controllers: [PlayerController],
  providers: [
    PlayerService,
    ContractService,
    PlayerAwardService,
    {
      provide: PLAYER_REPOSITORY,
      useExisting: PlayerRepository,
    },
    {
      provide: CONTRACT_REPOSITORY,
      useExisting: ContractRepository,
    },
    {
      provide: PLAYER_PHOTO_REPOSITORY,
      useExisting: PlayerPhotoRepository,
    },
  ],
  exports: [
    PlayerService,
    ContractService,
    PlayerAwardService,
    PLAYER_REPOSITORY,
    CONTRACT_REPOSITORY,
    PLAYER_PHOTO_REPOSITORY,
  ],
})
export class PlayerModule {}
