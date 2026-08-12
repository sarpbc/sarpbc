import { IsNotEmpty, IsString, Length } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsNotEmpty({ message: "Enter a username." })
  @IsString()
  @Length(1, 100, { message: "Username must be between 1 and 100 characters." })
  readonly userName!: string;
}
