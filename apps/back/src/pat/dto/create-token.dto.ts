import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { trimIncomingString } from "src/common/dto/trim-incoming-string";

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimIncomingString)
  name!: string;
}
