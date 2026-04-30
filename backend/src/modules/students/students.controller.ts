import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateStudentDto } from "./dto/create-student.dto";
import { StudentsService } from "./students.service";

@Controller("students")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles("ADMIN", "TEACHER")
  findAll(@Req() req: Request & { user: JwtUser }) {
    return this.studentsService.findAll(req.user);
  }

  @Get(":id")
  @Roles("ADMIN", "TEACHER", "STUDENT")
  findOne(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.studentsService.findOne(id, req.user);
  }

  @Post()
  @Roles("ADMIN", "TEACHER")
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }
}
