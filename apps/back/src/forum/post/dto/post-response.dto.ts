import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDate,
  ValidateNested,
  IsOptional,
  IsArray,
} from "class-validator";
import { Type, Expose } from "class-transformer";

export class ShortTopicDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class ReplyDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  author!: string;

  @Expose()
  @IsDate()
  createdAt!: Date;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  replies!: ReplyDto[];
}

export class PostDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @Expose()
  @ValidateNested()
  @Type(() => ShortTopicDto)
  topic!: ShortTopicDto;

  @Expose()
  @IsString()
  @IsNotEmpty()
  author!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  replies!: ReplyDto[];

  @Expose()
  @IsDate()
  createdAt!: Date;
}

export class PostResponse {
  @Expose()
  @ValidateNested()
  @Type(() => PostDto)
  @IsOptional()
  post!: PostDto | null;
}
