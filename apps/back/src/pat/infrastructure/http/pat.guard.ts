import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthenticationError } from "../../../common/domain/errors/authentication-error";
import type { PatService } from "../../application/pat.service";

const BEARER_PREFIX = /^bearer\s+/iu;

@Injectable()
export class PatAuthGuard implements CanActivate {
  constructor(private readonly patService: PatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const authHeader = request.headers.authorization;

    if (authHeader === undefined || authHeader === "" || !BEARER_PREFIX.test(authHeader)) {
      throw new AuthenticationError(
        "Missing API token. Send it as an Authorization: Bearer header.",
      );
    }

    const rawToken = authHeader.replace(BEARER_PREFIX, "");
    const user = await this.patService.resolveUser(rawToken);

    if (!user) {
      throw new AuthenticationError(
        "Invalid or revoked API token. Create a new one in the admin app.",
      );
    }

    request.user = user;

    return true;
  }
}
