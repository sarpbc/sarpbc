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
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";
import { trimIncomingString } from "../../common/dto/trim-incoming-string";

/** Shared write fields for create + update (update adds null clears). */
export class TournamentManualWriteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a slug, or leave empty to generate one from the name." })
  @MaxLength(255)
  @Transform(trimIncomingString)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimIncomingString)
  tier?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4", { message: "Choose a valid league from the list." })
  leagueId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: "Enter a valid start date (YYYY-MM-DD)." })
  beginAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: "Enter a valid end date (YYYY-MM-DD)." })
  endAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsUrl({}, { message: "Enter a valid image URL." })
  @MaxLength(255)
  @Transform(trimIncomingString)
  imageUrl?: string | null;

  @IsOptional()
  @IsArray({ message: "Teams must be a list of team ids." })
  @ArrayUnique({ message: "Each team can only be added once." })
  @IsUUID("4", { each: true, message: "Choose valid teams from the list." })
  teamIds?: string[];
}

export class CreateTournamentDto extends TournamentManualWriteDto {
  @IsString()
  @IsNotEmpty({ message: "Enter a tournament name." })
  @MaxLength(255)
  @Transform(trimIncomingString)
  name!: string;
}

export class UpdateTournamentDto extends TournamentManualWriteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Enter a tournament name." })
  @MaxLength(255)
  @Transform(trimIncomingString)
  name?: string;
}
