import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateNewsArticleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;
}
