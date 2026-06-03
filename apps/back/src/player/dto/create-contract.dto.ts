import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";
import { ContractRole } from "../domain/contract.entity";

export class CreateContractDto {
  @IsNotEmpty()
  @IsUUID()
  teamId!: string;

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
