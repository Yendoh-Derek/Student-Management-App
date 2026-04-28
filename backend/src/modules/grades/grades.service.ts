import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly gradeInclude = {
    assessment: {
      select: { id: true, title: true, termId: true, term: { select: { name: true } } }
    },
    enrollment: {
      include: {
        course: { select: { id: true, name: true, teacherId: true } },
        student: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    }
  } as const;

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
    const termValue = dto.term;
    const assessmentId = await this.validateAssessmentForEnrollment(
      dto.assessmentId,
      enrollment.courseId,
      termValue
    );

    const grade = await this.prisma.grade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        assessmentId,
        score: dto.score,
        term: dto.term
      },
      include: this.gradeInclude
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
        grades: { include: { assessment: { select: { title: true } } }, orderBy: { id: "asc" } }
      },
      orderBy: { id: "asc" }
    });

    const rows: Array<{
      courseId: number;
      courseName: string;
      term: string;
      score: number;
      gradeId: number;
      assessmentTitle: string | null;
    }> = [];

    for (const e of enrollments) {
      for (const g of e.grades) {
        rows.push({
          courseId: e.course.id,
          courseName: e.course.name,
          term: g.term,
          score: g.score,
          gradeId: g.id,
          assessmentTitle: g.assessment?.title ?? null
        });
      }
    }

    return {
      studentId: student.id,
      studentName: student.user.name,
      grades: rows
    };
  }

  async update(id: number, dto: UpdateGradeDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot update grades");
    }

    const existing = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: { course: true }
        }
      }
    });
    if (!existing) throw new NotFoundException("Grade not found");

    if (user.role === "TEACHER" && existing.enrollment.course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only update grades for your own courses");
    }

    const nextEnrollmentId = dto.enrollmentId ?? existing.enrollmentId;
    const nextEnrollment = await this.prisma.enrollment.findUnique({
      where: { id: nextEnrollmentId },
      include: { course: true }
    });
    if (!nextEnrollment) throw new NotFoundException("Enrollment not found");

    if (user.role === "TEACHER" && nextEnrollment.course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only assign grades in your own courses");
    }
    const nextTerm = dto.term ?? existing.term;
    const nextAssessmentId =
      dto.assessmentId ?? existing.assessmentId ?? undefined;
    const validatedAssessmentId = await this.validateAssessmentForEnrollment(
      nextAssessmentId,
      nextEnrollment.courseId,
      nextTerm
    );

    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        enrollmentId: nextEnrollmentId,
        assessmentId: validatedAssessmentId,
        score: dto.score ?? existing.score,
        term: nextTerm
      },
      include: this.gradeInclude
    });

    if (existing.enrollment.studentId !== nextEnrollment.studentId) {
      await this.recalculateStudentAverage(existing.enrollment.studentId);
    }
    await this.recalculateStudentAverage(nextEnrollment.studentId);

    return updated;
  }

  async remove(id: number, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot delete grades");
    }

    const existing = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: { course: true }
        }
      }
    });
    if (!existing) throw new NotFoundException("Grade not found");

    if (user.role === "TEACHER" && existing.enrollment.course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only delete grades for your own courses");
    }

    const deleted = await this.prisma.grade.delete({
      where: { id },
      include: this.gradeInclude
    });

    await this.recalculateStudentAverage(existing.enrollment.studentId);
    return deleted;
  }

  private async validateAssessmentForEnrollment(
    assessmentId: number | undefined,
    courseId: number,
    termValue: string
  ) {
    if (!assessmentId) return null;
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { term: { select: { name: true } } }
    });
    if (!assessment) {
      throw new NotFoundException("Assessment not found");
    }
    if (assessment.courseId !== courseId) {
      throw new BadRequestException("Assessment must belong to the same course as enrollment");
    }
    if (assessment.term.name !== termValue) {
      throw new BadRequestException(
        `Grade term must match assessment term (${assessment.term.name})`
      );
    }
    return assessment.id;
  }
}
