import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import type { ReplyTargetType } from "./reply-response.dto";

export class ListRepliesQueryDto {
  @IsEnum(["forumPost", "newsArticle", "match"], {
    message: "targetType must be forumPost, newsArticle, or match.",
  })
  readonly targetType!: ReplyTargetType;

  @IsUUID("4", { message: "targetId must be a valid UUID." })
  @IsNotEmpty()
  readonly targetId!: string;
}
