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
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { UpdateAssessmentDto } from "./dto/update-assessment.dto";
import { AssessmentsService } from "./assessments.service";

@Controller("assessments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  findAll(@Req() req: Request & { user: JwtUser }) {
    return this.assessmentsService.findAll(req.user);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.assessmentsService.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateAssessmentDto, @Req() req: Request & { user: JwtUser }) {
    return this.assessmentsService.create(dto, req.user);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAssessmentDto,
    @Req() req: Request & { user: JwtUser }
  ) {
    return this.assessmentsService.update(id, dto, req.user);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.assessmentsService.remove(id, req.user);
  }
}
