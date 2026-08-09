import { IsEnum, IsUUID } from "class-validator";
import { PlayerAwardType } from "../../player/player.entities";

export class CreatePlayerAwardDto {
  @IsUUID()
  participantId!: string;

  @IsUUID()
  playerId!: string;

  @IsEnum(PlayerAwardType)
  awardType!: PlayerAwardType;
}
