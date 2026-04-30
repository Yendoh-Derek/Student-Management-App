import { IsDateString, IsNotEmpty, IsString } from "class-validator";

export class CreateTermDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  startsOn!: string;

  @IsDateString()
  endsOn!: string;
}
