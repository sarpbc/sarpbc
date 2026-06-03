import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsOptional,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

class TranslationDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(["en-US", "fr-FR"])
  readonly locale!: "en-US" | "fr-FR";

  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  readonly title!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  readonly content!: string;
}

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  @MinLength(1)
  readonly title!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  @MinLength(1)
  readonly content!: string;

  @IsNotEmpty()
  @IsUUID()
  readonly topicId!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  readonly translations?: TranslationDto[];
}
