import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { StudentsModule } from "./modules/students/students.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AppController } from "./app.controller";
import { UsersModule } from "./modules/users/users.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { EnrollmentsModule } from "./modules/enrollments/enrollments.module";
import { GradesModule } from "./modules/grades/grades.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    CoursesModule,
    EnrollmentsModule,
    GradesModule,
    AnalyticsModule
  ],
  controllers: [AppController]
})
export class AppModule {}
