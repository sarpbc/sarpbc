import { IsIn, IsUUID } from "class-validator";
import { PLAYER_AWARD_TYPES, type PlayerAwardType } from "@sarpbc/types";

export class CreatePlayerAwardDto {
  @IsUUID()
  participantId!: string;

  @IsUUID()
  playerId!: string;

  @IsIn(PLAYER_AWARD_TYPES)
  awardType!: PlayerAwardType;
}
