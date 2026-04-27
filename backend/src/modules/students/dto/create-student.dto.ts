import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateStudentDto {
  @IsNumber()
  userId!: number;

  @IsString()
  classLevel!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  averageScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  attendanceRate?: number;
}
