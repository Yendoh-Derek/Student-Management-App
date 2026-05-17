import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { UpdateAssessmentDto } from "./dto/update-assessment.dto";

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly assessmentInclude = {
    course: { select: { id: true, name: true, teacherId: true, termId: true } },
    term: true
  } as const;

  private buildWhere(user: JwtUser) {
    if (user.role === "ADMIN") return {};
    if (user.role === "TEACHER") {
      return { course: { teacherId: user.userId } };
    }
    return {
      course: {
        enrollments: { some: { student: { userId: user.userId } } }
      }
    };
  }

  private async ensureCourseAndTerm(courseId: number, termId: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("Course not found");
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException("Term not found");
    if (course.termId != null && course.termId !== termId) {
      throw new BadRequestException("Assessment term must match course term");
    }
    return { course, term };
  }

  async create(dto: CreateAssessmentDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot create assessments");
    }
    const { course } = await this.ensureCourseAndTerm(dto.courseId, dto.termId);
    if (user.role === "TEACHER" && course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only create assessments for your own courses");
    }

    return this.prisma.assessment.create({
      data: {
        courseId: dto.courseId,
        termId: dto.termId,
        title: dto.title,
        category: dto.category,
        weight: dto.weight,
        maxScore: dto.maxScore ?? 100,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null
      },
      include: this.assessmentInclude
    });
  }

  findAll(user: JwtUser) {
    return this.prisma.assessment.findMany({
      where: this.buildWhere(user),
      include: this.assessmentInclude,
      orderBy: [{ termId: "asc" }, { dueAt: "asc" }, { id: "asc" }]
    });
  }

  async findOne(id: number, user: JwtUser) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, ...this.buildWhere(user) },
      include: this.assessmentInclude
    });
    if (!assessment) throw new NotFoundException("Assessment not found");
    return assessment;
  }

  async update(id: number, dto: UpdateAssessmentDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot update assessments");
    }
    const existing = await this.prisma.assessment.findUnique({
      where: { id },
      include: this.assessmentInclude
    });
    if (!existing) throw new NotFoundException("Assessment not found");

    const courseId = dto.courseId ?? existing.courseId;
    const termId = dto.termId ?? existing.termId;
    const { course } = await this.ensureCourseAndTerm(courseId, termId);
    if (user.role === "TEACHER" && course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only update assessments for your own courses");
    }

    return this.prisma.assessment.update({
      where: { id },
      data: {
        courseId,
        termId,
        title: dto.title ?? existing.title,
        category: dto.category ?? existing.category,
        weight: dto.weight ?? existing.weight,
        maxScore: dto.maxScore ?? existing.maxScore,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : existing.dueAt
      },
      include: this.assessmentInclude
    });
  }

  async remove(id: number, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot delete assessments");
    }
    const existing = await this.prisma.assessment.findUnique({
      where: { id },
      include: this.assessmentInclude
    });
    if (!existing) throw new NotFoundException("Assessment not found");
    if (user.role === "TEACHER" && existing.course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only delete assessments for your own courses");
    }

    return this.prisma.assessment.delete({
      where: { id },
      include: this.assessmentInclude
    });
  }
}
