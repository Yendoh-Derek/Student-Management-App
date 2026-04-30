import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  className!: string;

  @IsInt()
  @Min(1)
  termId!: number;
}
