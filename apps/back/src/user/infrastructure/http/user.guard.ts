import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { ForbiddenError } from "../../../common/domain/errors";
import { STAFF_PERMISSIONS_KEY } from "./decorator/require-permissions.decorator";
import type { StaffPermission } from "@sarpbc/types";
import { UserService } from "../../application/user.service";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requestUser = context.switchToHttp().getRequest<FastifyRequest>().user;

    if (!requestUser) {
      throw new ForbiddenError(
        "You must be signed in with a staff account to perform this action.",
      );
    }

    const required = this.reflector.getAllAndOverride<StaffPermission[]>(STAFF_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      throw new ForbiddenError(
        "This action is not configured for staff access. Contact a maintainer.",
      );
    }

    const allowed = await this.userService.hasAnyPermission(requestUser.id, required);
    if (!allowed) {
      throw new ForbiddenError(
        "You do not have permission for this action. Ask an admin to update your staff role.",
      );
    }

    return true;
  }
}
