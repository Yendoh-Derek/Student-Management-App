import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { GradesService } from "./grades.service";

@Controller("grades")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get("student/:id")
  findForStudent(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request & { user: JwtUser }
  ) {
    return this.gradesService.findForStudent(id, req.user);
  }

  @Post()
  @Roles("ADMIN", "TEACHER")
  create(@Body() dto: CreateGradeDto, @Req() req: Request & { user: JwtUser }) {
    return this.gradesService.create(dto, req.user);
  }

  @Patch(":id")
  @Roles("ADMIN", "TEACHER")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateGradeDto,
    @Req() req: Request & { user: JwtUser }
  ) {
    return this.gradesService.update(id, dto, req.user);
  }

  @Delete(":id")
  @Roles("ADMIN", "TEACHER")
  remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.gradesService.remove(id, req.user);
  }
}
