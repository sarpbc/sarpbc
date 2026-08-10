import { IsEnum, IsUUID } from "class-validator";
import { PlayerAwardType } from "@sarpbc/types";

export class CreatePlayerAwardDto {
  @IsUUID()
  participantId!: string;

  @IsUUID()
  playerId!: string;

  @IsEnum(PlayerAwardType)
  awardType!: PlayerAwardType;
}
