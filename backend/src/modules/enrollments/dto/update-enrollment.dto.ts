import { IsInt, IsOptional, Min } from "class-validator";

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseId?: number;
}
