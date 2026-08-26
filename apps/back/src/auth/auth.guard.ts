import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserToken } from "src/common/types/usertoken.interface";
import { UserService } from "src/user/user.service";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  signAuthTokenPair,
  verifyAuthToken,
  type AuthTokenType,
} from "./auth-cookies";

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

    const tokens = await signAuthTokenPair(this.jwtService, this.jwtSecret(), refreshUser);
    setAuthCookies(reply, tokens, this.configService.get<boolean>("production"));
    request.user = refreshUser;
    return true;
  }

  private jwtSecret(): string {
    return this.configService.get<string>("jwt_token")!;
  }

  private async userFromToken(token: string, typ: AuthTokenType): Promise<UserToken | null> {
    const payload = await verifyAuthToken(this.jwtService, this.jwtSecret(), token, typ);
    if (!payload) {
      return null;
    }

    const user = await this.userService.findById(payload.id);
    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email };
  }
}
