import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

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

  /** Optional URL slug. Normalized server-side. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a slug, or leave the field unchanged." })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  slug?: string;
}
