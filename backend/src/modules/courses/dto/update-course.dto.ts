import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  /** ADMIN can reassign a course teacher; TEACHER cannot. */
  @IsOptional()
  @IsInt()
  @Min(1)
  teacherId?: number;
}
