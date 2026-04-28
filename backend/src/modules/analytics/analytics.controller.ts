import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { Req } from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { JwtUser } from "../../common/types/jwt-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("student/:id")
  @Roles("ADMIN", "TEACHER", "STUDENT")
  getStudentAnalytics(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request & { user: JwtUser }
  ) {
    return this.analyticsService.getStudentAnalytics(id, req.user);
  }
}
