import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateGradeDto {
  @IsInt()
  @Min(1)
  enrollmentId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  assessmentId?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @IsString()
  @MinLength(1)
  term!: string;
}
