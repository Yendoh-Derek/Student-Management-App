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
import { CreateCourseDto } from "./dto/create-course.dto";
import { CoursesService } from "./courses.service";

/**
 * Course list rules: ADMIN sees all; TEACHER sees courses they teach;
 * STUDENT sees courses they are enrolled in.
 */
@Controller("courses")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll(@Req() req: Request & { user: JwtUser }) {
    return this.coursesService.findAll(req.user);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.coursesService.findOne(id, req.user);
  }

  @Post()
  @Roles("ADMIN", "TEACHER")
  create(@Body() dto: CreateCourseDto, @Req() req: Request & { user: JwtUser }) {
    return this.coursesService.create(dto, req.user);
  }
}
