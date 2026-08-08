import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { PatService, PatUser } from "./pat.service";

const BEARER_PREFIX = /^bearer\s+/i;

@Injectable()
export class PatAuthGuard implements CanActivate {
  constructor(private readonly patService: PatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: PatUser }>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !BEARER_PREFIX.test(authHeader)) {
      throw new UnauthorizedException(
        "Missing API token. Send it as an Authorization: Bearer header.",
      );
    }

    const rawToken = authHeader.replace(BEARER_PREFIX, "");
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
