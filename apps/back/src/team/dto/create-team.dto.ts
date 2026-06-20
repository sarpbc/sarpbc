import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
