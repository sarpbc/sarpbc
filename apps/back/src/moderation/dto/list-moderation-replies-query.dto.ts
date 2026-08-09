import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListModerationRepliesQueryDto extends PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  override limit: number = 50;
}
