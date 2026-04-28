import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: { headers?: { cookie?: string } }) => {
          const header = request?.headers?.cookie;
          if (!header) return null;
          const parts = header.split(";").map((part) => part.trim());
          const token = parts.find((part) => part.startsWith("accessToken="));
          if (!token) return null;
          return decodeURIComponent(token.slice("accessToken=".length));
        },
        ExtractJwt.fromAuthHeaderAsBearerToken()
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "dev-secret-change-me"
    });
  }

  validate(payload: { sub: number; email: string; role: string; type?: string }) {
    if (payload.type && payload.type !== "access") {
      throw new UnauthorizedException("Invalid access token");
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role
    };
  }
}
