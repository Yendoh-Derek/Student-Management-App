import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        userId: dto.userId,
        classLevel: dto.classLevel,
        averageScore: dto.averageScore ?? 0,
        attendanceRate: dto.attendanceRate ?? 1
      },
      include: { user: true }
    });
  }

  findAll() {
    return this.prisma.student.findMany({
      include: { user: true, grades: true },
      orderBy: { id: "asc" }
    });
  }

  async findOne(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: true, grades: true }
    });
    if (!student) throw new NotFoundException("Student not found");
    return student;
  }
}
