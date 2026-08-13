import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from "class-validator";
import { Transform } from "class-transformer";
import { emptyToNull } from "../news-locale.util";

export class CreateNewsArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string | null | undefined }) => emptyToNull(value))
  titleFr?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsString()
  @Transform(({ value }: { value: string | null | undefined }) => emptyToNull(value))
  contentFr?: string | null;

  @IsOptional()
  @IsUrl({}, { message: "Enter a valid cover image URL." })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  imageUrl?: string;

  /** Optional URL slug. Normalized server-side; defaults from title when omitted. */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a slug, or leave empty to generate one from the title." })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  slug?: string;
}
