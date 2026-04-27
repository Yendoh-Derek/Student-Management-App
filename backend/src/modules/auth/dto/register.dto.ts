import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";

export enum UserRoleDto {
  ADMIN = "ADMIN",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT"
}

export class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsEnum(UserRoleDto)
  role!: UserRoleDto;
}
