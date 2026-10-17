import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { trimIncomingString } from "../../../../common/infrastructure/http/dto/trim-incoming-string";

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimIncomingString)
  name!: string;
}
