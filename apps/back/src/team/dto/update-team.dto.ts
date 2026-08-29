import { IsOptional, IsString } from "class-validator";

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  darkModeImageUrl?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
