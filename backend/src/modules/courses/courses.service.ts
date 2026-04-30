import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly courseInclude = {
    teacher: { select: { id: true, name: true, email: true, role: true } },
    _count: { select: { enrollments: true } }
  } as const;

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
    if (user.role === "ADMIN") {
      return this.prisma.course.findMany({
        include: this.courseInclude,
        orderBy: { id: "asc" }
      });
    }

    if (user.role === "TEACHER") {
      return this.prisma.course.findMany({
        where: { teacherId: user.userId },
        include: this.courseInclude,
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
      include: this.courseInclude,
      orderBy: { id: "asc" }
    });
  }

  async findOne(id: number, user: JwtUser) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: this.courseInclude
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

  async update(id: number, dto: UpdateCourseDto, user: JwtUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException("Course not found");

    if (user.role === "TEACHER") {
      if (course.teacherId !== user.userId) {
        throw new ForbiddenException("You can only update your own courses");
      }
      if (dto.teacherId != null && dto.teacherId !== user.userId) {
        throw new ForbiddenException("Teachers cannot reassign course ownership");
      }
    } else if (user.role !== "ADMIN") {
      throw new ForbiddenException("Insufficient permissions to update a course");
    }

    const data: { name?: string; teacherId?: number } = {};
    if (dto.name != null) data.name = dto.name;
    if (dto.teacherId != null) data.teacherId = dto.teacherId;

    return this.prisma.course.update({
      where: { id },
      data,
      include: this.courseInclude
    });
  }

  async remove(id: number, user: JwtUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException("Course not found");

    if (user.role === "TEACHER" && course.teacherId !== user.userId) {
      throw new ForbiddenException("You can only delete your own courses");
    }
    if (user.role !== "ADMIN" && user.role !== "TEACHER") {
      throw new ForbiddenException("Insufficient permissions to delete a course");
    }

    return this.prisma.course.delete({
      where: { id },
      include: this.courseInclude
    });
  }
}
