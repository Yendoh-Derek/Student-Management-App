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
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { SectionsService } from "./sections.service";

@Controller("sections")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  findAll(@Req() req: Request & { user: JwtUser }) {
    return this.sectionsService.findAll(req.user);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.sectionsService.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateSectionDto, @Req() req: Request & { user: JwtUser }) {
    return this.sectionsService.create(dto, req.user);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSectionDto,
    @Req() req: Request & { user: JwtUser }
  ) {
    return this.sectionsService.update(id, dto, req.user);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.sectionsService.remove(id, req.user);
  }
}
