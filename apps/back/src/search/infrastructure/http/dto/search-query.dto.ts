import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { OffsetPaginationQueryDto } from "../../../../common/infrastructure/http/dto/offset-pagination-query.dto";
import type { SearchType } from "../../../application/models/search-result";

export class SearchQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(["player", "team", "tournament", "all"])
  type?: SearchType;
}
