import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** When omitted, TEACHER creates for self; ADMIN must set the teacher user id. */
  @IsOptional()
  @IsInt()
  @Min(1)
  teacherId?: number;
}
