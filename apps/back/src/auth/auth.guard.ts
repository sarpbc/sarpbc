import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest } from "fastify";
import { UserToken } from "src/common/types/usertoken.interface";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: UserToken }>();

    const token = request.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException("Missing auth token in cookie");
    }

    try {
      const payload = await this.jwtService.verifyAsync<UserToken>(token, {
        secret: this.configService.get<string>("jwt_token"),
      });

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
