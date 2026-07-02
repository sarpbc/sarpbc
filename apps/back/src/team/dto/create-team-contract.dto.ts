import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";
import { ContractRole } from "../../player/player.entities";

export class CreateTeamContractDto {
  @IsNotEmpty()
  @IsUUID()
  playerId!: string;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ContractRole)
  role?: ContractRole;
}
