import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { EnrollmentsService } from "./enrollments.service";

@Controller("enrollments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  findAll(
    @Req() req: Request & { user: JwtUser },
    @Query("courseId") courseId?: string,
    @Query("studentId") studentId?: string
  ) {
    return this.enrollmentsService.findAll(req.user, {
      courseId: courseId ? Number(courseId) : undefined,
      studentId: studentId ? Number(studentId) : undefined
    });
  }

  @Post()
  @Roles("ADMIN", "TEACHER")
  create(@Body() dto: CreateEnrollmentDto, @Req() req: Request & { user: JwtUser }) {
    return this.enrollmentsService.create(dto, req.user);
  }

  @Patch(":id")
  @Roles("ADMIN", "TEACHER")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEnrollmentDto,
    @Req() req: Request & { user: JwtUser }
  ) {
    return this.enrollmentsService.update(id, dto, req.user);
  }

  @Delete(":id")
  @Roles("ADMIN", "TEACHER")
  remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.enrollmentsService.remove(id, req.user);
  }
}
