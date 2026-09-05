import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { trimIncomingString } from "../../common/dto/trim-incoming-string";

export class TweetEmbedQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  @Transform(trimIncomingString)
  url!: string;
}
