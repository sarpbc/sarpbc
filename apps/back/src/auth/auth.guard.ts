import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserToken } from "src/common/types/usertoken.interface";
import { UserService } from "src/user/user.service";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_EXPIRES_IN,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  type AuthTokenType,
} from "./auth-cookies";

interface SignedTokenPayload extends UserToken {
  typ?: AuthTokenType;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest & { user?: UserToken }>();
    const reply = http.getResponse<FastifyReply>();

    const accessToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE];

    const accessUser = accessToken ? await this.userFromToken(accessToken, "access") : null;
    if (accessUser) {
      request.user = accessUser;
      return true;
    }

    if (!refreshToken) {
      throw new UnauthorizedException(
        accessToken ? "Invalid or expired token" : "Missing auth token in cookie",
      );
    }

    const refreshUser = await this.userFromToken(refreshToken, "refresh");
    if (!refreshUser) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    await this.rotateCookies(reply, refreshUser);
    request.user = refreshUser;
    return true;
  }

  private jwtSecret(): string | undefined {
    return this.configService.get<string>("jwt_token");
  }

  private async userFromToken(token: string, typ: AuthTokenType): Promise<UserToken | null> {
    try {
      const payload = await this.jwtService.verifyAsync<SignedTokenPayload>(token, {
        secret: this.jwtSecret(),
      });
      if (payload.typ !== typ || !payload.id) {
        return null;
      }

      const user = await this.userService.findById(payload.id);
      if (!user) {
        return null;
      }

      return { id: user.id, email: user.email };
    } catch {
      return null;
    }
  }

  private async rotateCookies(reply: FastifyReply, user: UserToken): Promise<void> {
    const secret = this.jwtSecret();
    const production = this.configService.get<boolean>("production");
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...user, typ: "access" satisfies AuthTokenType },
        {
          secret,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      ),
      this.jwtService.signAsync(
        { ...user, typ: "refresh" satisfies AuthTokenType },
        {
          secret,
          expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        },
      ),
    ]);

    if (typeof reply.setCookie !== "function") {
      return;
    }

    reply.setCookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions(production, true));
    reply.setCookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      refreshTokenCookieOptions(production, true),
    );
  }
}
