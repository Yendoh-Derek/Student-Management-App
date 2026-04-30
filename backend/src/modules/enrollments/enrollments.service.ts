import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly enrollmentInclude = {
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
  } as const;

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
      include: this.enrollmentInclude
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
        include: this.enrollmentInclude,
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
      include: this.enrollmentInclude,
      orderBy: { id: "asc" }
    });
  }

  async update(id: number, dto: UpdateEnrollmentDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot update enrollments");
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!existing) throw new NotFoundException("Enrollment not found");

    if (user.role === "TEACHER" && existing.course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only update enrollments for your own courses");
    }

    const nextStudentId = dto.studentId ?? existing.studentId;
    const nextCourseId = dto.courseId ?? existing.courseId;

    const nextCourse = await this.prisma.course.findUnique({
      where: { id: nextCourseId }
    });
    if (!nextCourse) throw new NotFoundException("Course not found");

    if (user.role === "TEACHER" && nextCourse.teacherId !== user.userId) {
      throw new ForbiddenException("You can only assign enrollments to your own courses");
    }

    const nextStudent = await this.prisma.student.findUnique({
      where: { id: nextStudentId }
    });
    if (!nextStudent) throw new NotFoundException("Student not found");

    const duplicate = await this.prisma.enrollment.findFirst({
      where: {
        id: { not: id },
        studentId: nextStudentId,
        courseId: nextCourseId
      }
    });
    if (duplicate) {
      throw new ConflictException("Student is already enrolled in this course");
    }

    return this.prisma.enrollment.update({
      where: { id },
      data: {
        studentId: nextStudentId,
        courseId: nextCourseId
      },
      include: this.enrollmentInclude
    });
  }

  async remove(id: number, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot delete enrollments");
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!existing) throw new NotFoundException("Enrollment not found");

    if (user.role === "TEACHER" && existing.course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only delete enrollments for your own courses");
    }

    return this.prisma.enrollment.delete({
      where: { id },
      include: this.enrollmentInclude
    });
  }
}
