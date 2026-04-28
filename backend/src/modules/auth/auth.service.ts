import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: Role.STUDENT
      }
    });

    return this.createSession(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    return this.createSession(user.id, user.email, user.role);
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException("Missing refresh token");
    const payload = await this.verifyRefreshToken(refreshToken);
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token type");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        refreshTokenHash: true,
        refreshTokenExp: true
      }
    });
    if (!user || !user.refreshTokenHash || !user.refreshTokenExp) {
      throw new UnauthorizedException("Invalid refresh session");
    }
    const refreshTokenExpiry = new Date(user.refreshTokenExp);
    if (Number.isNaN(refreshTokenExpiry.getTime()) || refreshTokenExpiry.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException("Invalid refresh session");

    return this.createSession(user.id, user.email, user.role);
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExp: null }
    });
    return { ok: true };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true }
    });
    if (!user) {
      throw new UnauthorizedException("Session is invalid");
    }
    return { user };
  }

  private async createSession(userId: number, email: string, role: Role) {
    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as
      | number
      | `${number}${"ms" | "s" | "m" | "h" | "d"}`;
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as
      | number
      | `${number}${"ms" | "s" | "m" | "h" | "d"}`;
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role, type: "access" },
      { expiresIn: accessExpiresIn }
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role, type: "refresh" },
      { expiresIn: refreshExpiresIn }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshTokenExp = this.decodeExpiry(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash, refreshTokenExp }
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, role }
    };
  }

  private decodeExpiry(token: string) {
    const payload = this.jwtService.decode(token) as { exp?: number } | null;
    if (!payload?.exp) {
      throw new ForbiddenException("Unable to decode refresh token expiry");
    }
    return new Date(payload.exp * 1000);
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
        role: Role;
        type?: string;
      }>(token, { secret: process.env.JWT_SECRET ?? "dev-secret-change-me" });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
}
