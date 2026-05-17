import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateGradeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  enrollmentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  assessmentId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  term?: string;
}
