import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { NEWS_TYPES, type NewsType } from "@sarpbc/types";
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

  @IsOptional()
  @IsIn(NEWS_TYPES)
  type?: NewsType;
}
