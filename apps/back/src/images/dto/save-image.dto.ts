import { IsNotEmpty, IsString } from "class-validator";

export class SaveImageDto {
  @IsString()
  @IsNotEmpty()
  imageId!: string;
}
