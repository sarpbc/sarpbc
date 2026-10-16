import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTopicDto {
  @IsNotEmpty()
  @IsString()
  readonly title!: string;

  @IsString()
  @IsOptional()
  readonly description?: string;
}
