import { IsString, IsNotEmpty } from "class-validator";

export class MakePickDto {
  @IsString()
  @IsNotEmpty()
  pickedParticipantId!: string;
}
