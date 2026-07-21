import { Expose, Type } from "class-transformer";

export type ReplyTargetType = "forumPost" | "newsArticle" | "match";

export class ReplyAuthorDto {
  @Expose()
  id!: string;

  @Expose()
  userName!: string;
}

export class ReplyResponseDto {
  @Expose()
  id!: string;

  @Expose()
  content!: string;

  @Expose()
  @Type(() => ReplyAuthorDto)
  author!: ReplyAuthorDto;

  @Expose()
  createdAt!: Date;

  @Expose()
  @Type(() => ReplyResponseDto)
  replies!: ReplyResponseDto[];
}

export class RepliesListResponseDto {
  @Expose()
  @Type(() => ReplyResponseDto)
  replies!: ReplyResponseDto[];
}
