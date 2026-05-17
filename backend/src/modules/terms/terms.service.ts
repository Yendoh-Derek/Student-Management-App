import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtUser } from "../../common/types/jwt-user";
import { CreateTermDto } from "./dto/create-term.dto";
import { UpdateTermDto } from "./dto/update-term.dto";

@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private parseRange(startsOn: string, endsOn: string) {
    const starts = new Date(startsOn);
    const ends = new Date(endsOn);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      throw new BadRequestException("Invalid date range");
    }
    if (starts >= ends) {
      throw new BadRequestException("startsOn must be before endsOn");
    }
    return { starts, ends };
  }

  create(dto: CreateTermDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot create terms");
    }
    const { starts, ends } = this.parseRange(dto.startsOn, dto.endsOn);
    return this.prisma.term.create({
      data: { name: dto.name, startsOn: starts, endsOn: ends }
    });
  }

  findAll(user: JwtUser) {
    return this.prisma.term.findMany({
      where: this.buildWhere(user),
      orderBy: { startsOn: "asc" }
    });
  }

  async findOne(id: number, user: JwtUser) {
    const term = await this.prisma.term.findFirst({
      where: { id, ...this.buildWhere(user) }
    });
    if (!term) throw new NotFoundException("Term not found");
    return term;
  }

  async update(id: number, dto: UpdateTermDto, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot update terms");
    }
    const existing = await this.prisma.term.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Term not found");

    const starts = dto.startsOn ? new Date(dto.startsOn) : existing.startsOn;
    const ends = dto.endsOn ? new Date(dto.endsOn) : existing.endsOn;
    if (starts >= ends) {
      throw new BadRequestException("startsOn must be before endsOn");
    }

    return this.prisma.term.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        startsOn: starts,
        endsOn: ends
      }
    });
  }

  async remove(id: number, user: JwtUser) {
    if (user.role === "STUDENT") {
      throw new ForbiddenException("Students cannot delete terms");
    }
    const existing = await this.prisma.term.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Term not found");
    return this.prisma.term.delete({ where: { id } });
  }
}
