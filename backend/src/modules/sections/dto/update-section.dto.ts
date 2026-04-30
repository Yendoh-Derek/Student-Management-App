import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  className?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  termId?: number;
}
