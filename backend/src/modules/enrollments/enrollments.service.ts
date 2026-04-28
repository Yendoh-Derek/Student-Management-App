import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnrollmentDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot create enrollments");
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId }
    });
    if (!course) throw new NotFoundException("Course not found");

    if (user.role === "TEACHER" && course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only enroll students in your own courses");
    }

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId }
    });
    if (!student) throw new NotFoundException("Student not found");

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: dto.studentId,
          courseId: dto.courseId
        }
      }
    });
    if (existing) {
      throw new ConflictException("Student is already enrolled in this course");
    }

    return this.prisma.enrollment.create({
      data: {
        studentId: dto.studentId,
        courseId: dto.courseId
      },
      include: {
        course: {
          select: { id: true, name: true, teacherId: true }
        },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
  }

  /**
   * ADMIN: optional filters. TEACHER: scoped to their courses. STUDENT: own enrollments only.
   */
  async findAll(
    user: JwtUser,
    query: { courseId?: number; studentId?: number }
  ) {
    if (user.role === "STUDENT") {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.userId }
      });
      if (!student) return [];
      return this.prisma.enrollment.findMany({
        where: { studentId: student.id },
        include: {
          course: {
            include: {
              teacher: { select: { id: true, name: true, email: true } }
            }
          },
          student: {
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          },
          grades: true
        },
        orderBy: { id: "asc" }
      });
    }

    const where: {
      courseId?: number;
      studentId?: number;
      course?: { teacherId: number };
    } = {};

    if (query.courseId != null) where.courseId = query.courseId;
    if (query.studentId != null) where.studentId = query.studentId;

    if (user.role === "TEACHER") {
      where.course = { teacherId: user.userId };
    }

    return this.prisma.enrollment.findMany({
      where,
      include: {
        course: {
          include: {
            teacher: { select: { id: true, name: true, email: true } }
          }
        },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        grades: true
      },
      orderBy: { id: "asc" }
    });
  }
}
