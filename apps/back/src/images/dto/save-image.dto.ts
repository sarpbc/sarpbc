import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class SaveImageDto {
  @IsString()
  @IsNotEmpty()
  imageId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  source?: string;

  @IsOptional()
  @IsUrl({}, { message: "Enter a valid source URL." })
  @MaxLength(500)
  sourceUrl?: string;
}
