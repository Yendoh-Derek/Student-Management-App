import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import type { JwtUser } from "../../common/types/jwt-user";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.authService.register(dto);
    this.setSessionCookies(res, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.authService.login(dto);
    this.setSessionCookies(res, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.readCookie(req.headers.cookie, "refreshToken");
    const session = await this.authService.refreshSession(refreshToken ?? "");
    this.setSessionCookies(res, session.accessToken, session.refreshToken);
    return { user: session.user };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request & { user: JwtUser },
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logout(req.user.userId);
    this.clearSessionCookies(res);
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: JwtUser }) {
    return this.authService.me(req.user.userId);
  }

  private setSessionCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }

  private clearSessionCookies(res: Response) {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0
    });
    res.cookie("refreshToken", "", {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 0
    });
  }

  private readCookie(cookieHeader: string | undefined, name: string) {
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(";").map((part) => part.trim());
    const prefixed = `${name}=`;
    const found = parts.find((part) => part.startsWith(prefixed));
    if (!found) return null;
    return decodeURIComponent(found.slice(prefixed.length));
  }
}
