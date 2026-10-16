import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  readonly email!: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  readonly password!: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  readonly userName!: string;
}
