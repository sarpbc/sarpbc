import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreatePlayerDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
