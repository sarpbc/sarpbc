import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GuessDto {
  @IsString()
  @IsNotEmpty()
  guess!: string;

  @IsOptional()
  @IsBoolean()
  last?: boolean;
}
