import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateGradeDto } from "./dto/create-grade.dto";

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateStudentAverage(studentId: number) {
    const grades = await this.prisma.grade.findMany({
      where: { enrollment: { studentId } },
      select: { score: true }
    });
    const avg =
      grades.length === 0
        ? 0
        : grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
    await this.prisma.student.update({
      where: { id: studentId },
      data: { averageScore: avg }
    });
  }

  async create(dto: CreateGradeDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot record grades");
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: { course: true }
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    if (user.role === "TEACHER" && enrollment.course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only grade your own courses");
    }

    const grade = await this.prisma.grade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        score: dto.score,
        term: dto.term
      },
      include: {
        enrollment: {
          include: {
            course: { select: { id: true, name: true } },
            student: {
              include: {
                user: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });

    await this.recalculateStudentAverage(enrollment.studentId);
    return grade;
  }

  async findForStudent(studentId: number, user: JwtUser) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true }
    });
    if (!student) throw new NotFoundException("Student not found");

    if (user.role === "STUDENT" && student.userId !== user.userId) {
      throw new ForbiddenException();
    }

    const enrollmentWhere =
      user.role === "TEACHER"
        ? {
            studentId,
            course: { teacherId: user.userId }
          }
        : { studentId };

    const enrollments = await this.prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        course: { select: { id: true, name: true, teacherId: true } },
        grades: { orderBy: { id: "asc" } }
      },
      orderBy: { id: "asc" }
    });

    const rows: Array<{
      courseId: number;
      courseName: string;
      term: string;
      score: number;
      gradeId: number;
    }> = [];

    for (const e of enrollments) {
      for (const g of e.grades) {
        rows.push({
          courseId: e.course.id,
          courseName: e.course.name,
          term: g.term,
          score: g.score,
          gradeId: g.id
        });
      }
    }

    return {
      studentId: student.id,
      studentName: student.user.name,
      grades: rows
    };
  }
}
