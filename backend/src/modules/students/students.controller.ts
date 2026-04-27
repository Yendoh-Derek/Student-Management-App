import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateStudentDto } from "./dto/create-student.dto";
import { StudentsService } from "./students.service";

@Controller("students")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @Roles("ADMIN", "TEACHER")
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }
}
