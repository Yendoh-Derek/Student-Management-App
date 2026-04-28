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
import { CreateTermDto } from "./dto/create-term.dto";
import { UpdateTermDto } from "./dto/update-term.dto";
import { TermsService } from "./terms.service";

@Controller("terms")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  findAll(@Req() req: Request & { user: JwtUser }) {
    return this.termsService.findAll(req.user);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.termsService.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateTermDto, @Req() req: Request & { user: JwtUser }) {
    return this.termsService.create(dto, req.user);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTermDto,
    @Req() req: Request & { user: JwtUser }
  ) {
    return this.termsService.update(id, dto, req.user);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Req() req: Request & { user: JwtUser }) {
    return this.termsService.remove(id, req.user);
  }
}
