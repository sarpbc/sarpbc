import { Expose, Type } from "class-transformer";
import { ReplyResponseDto } from "./reply-response.dto";

export class PaginatedRepliesResponseDto {
  @Expose()
  @Type(() => ReplyResponseDto)
  replies!: ReplyResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;
}
