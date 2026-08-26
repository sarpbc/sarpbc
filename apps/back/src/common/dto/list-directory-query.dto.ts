import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { OffsetPaginationQueryDto } from "./offset-pagination-query.dto";
import { parseOptionalBoolean } from "./parse-optional-boolean";

export class ListTournamentsQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  override limit: number = 20;

  @IsOptional()
  @Transform(parseOptionalBoolean)
  @IsBoolean()
  pickems?: boolean;

  @IsOptional()
  @Transform(parseOptionalBoolean)
  @IsBoolean()
  activeOnly?: boolean;
}

export class ListDirectoryQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  start?: string;
}
