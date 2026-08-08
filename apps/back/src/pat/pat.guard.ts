import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { UserToken } from "src/common/types/usertoken.interface";
import { PatService } from "./pat.service";

@Injectable()
export class PatAuthGuard implements CanActivate {
  constructor(private readonly patService: PatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: UserToken }>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Missing API token. Send it as an Authorization: Bearer header.",
      );
    }

    const rawToken = authHeader.slice("Bearer ".length);
    const user = await this.patService.resolveUser(rawToken);
    if (!user) {
      throw new UnauthorizedException(
        "Invalid or revoked API token. Create a new one in the admin app.",
      );
    }

    request.user = user;
    return true;
  }
}
