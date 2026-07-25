import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateNewsArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  /** Optional URL slug. Normalized server-side; defaults from title when omitted. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a slug, or leave empty to generate one from the title." })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  slug?: string;
}
