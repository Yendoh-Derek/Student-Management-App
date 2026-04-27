import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("student/:id")
  @Roles("ADMIN", "TEACHER", "STUDENT")
  getStudentAnalytics(@Param("id", ParseIntPipe) id: number) {
    return this.analyticsService.getStudentAnalytics(id);
  }
}
