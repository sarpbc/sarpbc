import { IsNotEmpty, IsString, Length } from "class-validator";
import { Transform } from "class-transformer";
import { trimIncomingString } from "../../common/dto/trim-incoming-string";

export class UpdateProfileDto {
  @Transform(trimIncomingString)
  @IsNotEmpty({ message: "Enter a username." })
  @IsString()
  @Length(1, 100, { message: "Username must be between 1 and 100 characters." })
  readonly userName!: string;
}
