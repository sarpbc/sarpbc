import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { OffsetPaginationQueryDto } from "../../common/dto/offset-pagination-query.dto";
import type { SearchType } from "../interfaces/search-result.interface";

export class SearchQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(["player", "team", "tournament", "all"])
  type?: SearchType;
}
