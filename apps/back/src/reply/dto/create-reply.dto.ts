import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { trimIncomingString } from "src/common/dto/trim-incoming-string";

@ValidatorConstraint({ name: "exactlyOneReplyTarget", async: false })
export class ExactlyOneReplyTargetConstraint implements ValidatorConstraintInterface {
  validate(_value: string, args: ValidationArguments): boolean {
    const dto = args.object as CreateReplyDto;
    const targets = [dto.postId, dto.newsArticleId, dto.matchId].filter(
      (id) => id !== undefined && id !== null && id !== "",
    );
    return targets.length === 1;
  }

  defaultMessage(): string {
    return "Provide exactly one of postId, newsArticleId, or matchId.";
  }
}

export class CreateReplyDto {
  @Transform(trimIncomingString)
  @IsNotEmpty({ message: "Comment cannot be empty. Write something before posting." })
  @IsString()
  @MaxLength(2048, {
    message: "Comment is too long. Keep it under 2048 characters.",
  })
  @MinLength(1, {
    message: "Comment cannot be empty. Write something before posting.",
  })
  @Validate(ExactlyOneReplyTargetConstraint)
  readonly content!: string;

  @IsOptional()
  @IsUUID("4", { message: "postId must be a valid UUID." })
  readonly postId?: string;

  @IsOptional()
  @IsUUID("4", { message: "newsArticleId must be a valid UUID." })
  readonly newsArticleId?: string;

  @IsOptional()
  @IsUUID("4", { message: "matchId must be a valid UUID." })
  readonly matchId?: string;

  @IsOptional()
  @IsUUID("4", { message: "replyToId must be a valid UUID." })
  readonly replyToId?: string;
}
