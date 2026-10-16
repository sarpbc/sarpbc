import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";

export class AddParticipantPlayerDto {
  @IsString()
  playerId!: string;

  @IsString()
  playerName!: string;

  @IsOptional()
  @IsString()
  playerSlug?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  nationality?: string;
}

export class AddParticipantDto {
  @IsString()
  teamId!: string;

  @IsString()
  teamName!: string;

  @IsOptional()
  @IsString()
  teamSlug?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => AddParticipantPlayerDto)
  players!: AddParticipantPlayerDto[];
}
