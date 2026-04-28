import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly sectionInclude = {
    term: true,
    courses: { select: { id: true, name: true, teacherId: true } }
  } as const;

  private buildWhere(user: JwtUser) {
    if (user.role === "ADMIN") return {};
    if (user.role === "TEACHER") {
      return { courses: { some: { teacherId: user.userId } } };
    }
    return {
      courses: {
        some: { enrollments: { some: { student: { userId: user.userId } } } }
      }
    };
  }

  private async ensureTermExists(termId: number) {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException("Term not found");
    return term;
  }

  private async ensureTeacherCanMutate(termId: number, user: JwtUser) {
    if (user.role !== "TEACHER") return;
    const hasTeachingCourseInTerm = await this.prisma.course.findFirst({
      where: { teacherId: user.userId, termId },
      select: { id: true }
    });
    if (!hasTeachingCourseInTerm) {
      throw new ForbiddenException("Teachers can only manage sections for terms they teach in");
    }
  }

  async create(dto: CreateSectionDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot create sections");
    }
    await this.ensureTermExists(dto.termId);
    await this.ensureTeacherCanMutate(dto.termId, user);
    return this.prisma.section.create({
      data: {
        name: dto.name,
        className: dto.className,
        termId: dto.termId
      },
      include: this.sectionInclude
    });
  }

  findAll(user: JwtUser) {
    return this.prisma.section.findMany({
      where: this.buildWhere(user),
      include: this.sectionInclude,
      orderBy: [{ className: "asc" }, { name: "asc" }]
    });
  }

  async findOne(id: number, user: JwtUser) {
    const section = await this.prisma.section.findFirst({
      where: { id, ...this.buildWhere(user) },
      include: this.sectionInclude
    });
    if (!section) throw new NotFoundException("Section not found");
    return section;
  }

  async update(id: number, dto: UpdateSectionDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot update sections");
    }
    const existing = await this.prisma.section.findUnique({
      where: { id },
      include: this.sectionInclude
    });
    if (!existing) throw new NotFoundException("Section not found");

    const termId = dto.termId ?? existing.termId;
    await this.ensureTermExists(termId);
    await this.ensureTeacherCanMutate(termId, user);

    if (user.role === "TEACHER" && existing.courses.some((course) => course.teacherId !== user.userId)) {
      throw new ForbiddenException("You can only update sections connected to your courses");
    }

    return this.prisma.section.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        className: dto.className ?? existing.className,
        termId
      },
      include: this.sectionInclude
    });
  }

  async remove(id: number, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot delete sections");
    }
    const existing = await this.prisma.section.findUnique({
      where: { id },
      include: this.sectionInclude
    });
    if (!existing) throw new NotFoundException("Section not found");
    await this.ensureTeacherCanMutate(existing.termId, user);
    if (user.role === "TEACHER" && existing.courses.some((course) => course.teacherId !== user.userId)) {
      throw new ForbiddenException("You can only delete sections connected to your courses");
    }
    return this.prisma.section.delete({
      where: { id },
      include: this.sectionInclude
    });
  }
}
