import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { ContractRole } from "../../player/domain/contract.entity";

export class UpdateTeamContractDto {
  @IsOptional()
  @IsUUID()
  playerId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsEnum(ContractRole)
  role?: ContractRole;
}
