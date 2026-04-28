import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateCourseDto } from "./dto/create-course.dto";

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto, user: JwtUser) {
    let teacherId = dto.teacherId;
    if (user.role === "TEACHER") {
      teacherId = user.userId;
    } else if (user.role === "ADMIN") {
      if (teacherId == null) {
        throw new ForbiddenException("teacherId is required when creating a course as admin");
      }
    } else {
      throw new ForbiddenException("Insufficient permissions to create a course");
    }

    return this.prisma.course.create({
      data: {
        name: dto.name,
        teacherId: teacherId!
      },
      include: {
        teacher: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { enrollments: true } }
      }
    });
  }

  async findAll(user: JwtUser) {
    const include = {
      teacher: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { enrollments: true } }
    } as const;

    if (user.role === "ADMIN") {
      return this.prisma.course.findMany({
        include,
        orderBy: { id: "asc" }
      });
    }

    if (user.role === "TEACHER") {
      return this.prisma.course.findMany({
        where: { teacherId: user.userId },
        include,
        orderBy: { id: "asc" }
      });
    }

    const student = await this.prisma.student.findUnique({
      where: { userId: user.userId }
    });
    if (!student) {
      return [];
    }

    return this.prisma.course.findMany({
      where: {
        enrollments: { some: { studentId: student.id } }
      },
      include,
      orderBy: { id: "asc" }
    });
  }

  async findOne(id: number, user: JwtUser) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { enrollments: true } }
      }
    });
    if (!course) throw new NotFoundException("Course not found");

    if (user.role === "ADMIN") return course;

    if (user.role === "TEACHER" && course.teacherId === user.userId) {
      return course;
    }

    if (user.role === "STUDENT") {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.userId }
      });
      if (!student) throw new ForbiddenException();
      const enrolled = await this.prisma.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: student.id, courseId: id }
        }
      });
      if (enrolled) return course;
    }

    throw new ForbiddenException("You cannot access this course");
  }
}
