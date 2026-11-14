import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthenticationError } from "../../../common/domain/errors/authentication-error";
import type { AuthService } from "../../application/auth.service";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, setAuthCookies } from "./auth-cookies";
import type { AuthCookieConfig } from "./auth-cookies";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const accessToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE];

    const accessUser =
      accessToken !== undefined && accessToken !== ""
        ? await this.authService.authenticate(accessToken)
        : null;

    if (accessUser) {
      request.user = accessUser;

      return true;
    }

    if (refreshToken === undefined || refreshToken === "") {
      throw new AuthenticationError(
        accessToken !== undefined && accessToken !== ""
          ? "Invalid or expired token"
          : "Missing auth token in cookie",
      );
    }

    const session = await this.authService.refreshSession(refreshToken);

    if (!session) {
      throw new AuthenticationError("Invalid or expired token");
    }

    setAuthCookies(reply, session.tokens, this.configService.get<AuthCookieConfig>("authCookie"));
    request.user = session.user;

    return true;
  }
}
