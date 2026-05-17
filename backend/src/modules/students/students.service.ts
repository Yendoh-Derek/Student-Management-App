import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateStudentDto } from "./dto/create-student.dto";
import { PaginatedResponse } from "../../common/dto/pagination.dto";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        userId: dto.userId,
        classLevel: dto.classLevel,
        averageScore: dto.averageScore ?? 0,
        attendanceRate: dto.attendanceRate ?? 1,
      },
      include: { user: true },
    });
  }

  async findAll(
    user: JwtUser,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;
    const where =
      user.role === "TEACHER"
        ? { enrollments: { some: { course: { teacherId: user.userId } } } }
        : {};
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          enrollments: {
            include: {
              course: { select: { id: true, name: true } },
              grades: true,
            },
          },
        },
        orderBy: { id: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, user: JwtUser) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        enrollments: {
          include: {
            course: { select: { id: true, name: true, teacherId: true } },
            grades: true,
          },
        },
      },
    });
    if (!student) throw new NotFoundException("Student not found");
    if (user.role === "STUDENT" && student.userId !== user.userId) {
      throw new ForbiddenException(
        "You can only access your own student profile",
      );
    }
    if (
      user.role === "TEACHER" &&
      !student.enrollments.some(
        (enrollment) => enrollment.course.teacherId === user.userId,
      )
    ) {
      throw new ForbiddenException(
        "You can only access students in your courses",
      );
    }

    return student;
  }
}
