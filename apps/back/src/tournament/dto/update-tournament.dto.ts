import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a tournament name." })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a slug, or leave empty to generate one from the name." })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  tier?: string;

  @IsOptional()
  @IsUUID("4", { message: "Choose a valid league from the list." })
  leagueId?: string | null;

  @IsOptional()
  @IsDateString({}, { message: "Enter a valid start date (YYYY-MM-DD)." })
  beginAt?: string | null;

  @IsOptional()
  @IsDateString({}, { message: "Enter a valid end date (YYYY-MM-DD)." })
  endAt?: string | null;

  @IsOptional()
  @IsUrl({}, { message: "Enter a valid image URL." })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  imageUrl?: string | null;

  @IsOptional()
  @IsArray({ message: "Teams must be a list of team ids." })
  @ArrayUnique({ message: "Each team can only be added once." })
  @IsUUID("4", { each: true, message: "Choose valid teams from the list." })
  teamIds?: string[];
}
