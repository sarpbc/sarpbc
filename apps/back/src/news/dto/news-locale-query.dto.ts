import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class NewsLocaleQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;
}

export class NewsListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;
}
