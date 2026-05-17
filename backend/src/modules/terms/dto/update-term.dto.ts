import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateTermDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsDateString()
  startsOn?: string;

  @IsOptional()
  @IsDateString()
  endsOn?: string;
}
