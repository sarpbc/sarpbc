import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  override limit: number = 30;
}
