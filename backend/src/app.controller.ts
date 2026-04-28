import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      status: "ok",
      service: "backend",
      message: "Student Management API is running",
      docs: {
        health: "/health",
        authLogin: "/auth/login",
        students: "/students",
        courses: "/courses"
      }
    };
  }

  @Get("health")
  health() {
    return { status: "ok", service: "backend" };
  }
}
