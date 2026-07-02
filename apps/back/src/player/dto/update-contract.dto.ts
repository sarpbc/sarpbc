import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { ContractRole } from "../player.entities";

export class UpdateContractDto {
  @IsOptional()
  @IsUUID()
  teamId?: string;

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
