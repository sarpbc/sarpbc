import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from "class-validator";
import { Transform } from "class-transformer";
import { emptyToNull } from "./empty-to-null";
import { trimIncomingString } from "src/common/dto/trim-incoming-string";

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
  @ValidateIf((_, value) => value !== null)
  @IsUrl({}, { message: "Enter a valid cover image URL." })
  @MaxLength(255)
  @Transform(trimIncomingString)
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a slug, or leave the field unchanged." })
  @MaxLength(255)
  @Transform(trimIncomingString)
  slug?: string;
}
