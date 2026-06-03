import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  ArrayMinSize,
} from "class-validator";

export class CreateMatchDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsDateString()
  beginAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  numberOfGames?: number;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  participantIds!: string[];

  @IsOptional()
  @IsNumber()
  pandascoreId?: number;
}

export class SetMatchWinnerDto {
  @IsString()
  winnerId!: string;
}
