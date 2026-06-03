import { IsNotEmpty, IsString, IsUUID, IsOptional, MaxLength, MinLength } from "class-validator";

export class CreateReplyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  @MinLength(1)
  readonly content!: string;

  @IsOptional()
  @IsUUID()
  readonly postId?: string;

  @IsOptional()
  @IsUUID()
  readonly newsArticleId?: string;

  @IsOptional()
  @IsUUID()
  readonly replyToId?: string;
}
