import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticatedRequest } from "src/common/types/authenticated.interface";
import { STAFF_PERMISSIONS_KEY } from "./decorator/require-permissions.decorator";
import { StaffPermission } from "./domain/staff-access";
import { UserService } from "./user.service";

/**
 * Requires any of the permissions set via @RequirePermissions().
 * Permissions are granted by the user's pre-configured staff role.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthenticatedRequest = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestUser = request.user;

    if (!requestUser) {
      throw new ForbiddenException(
        "You must be signed in with a staff account to perform this action.",
      );
    }

    const required = this.reflector.getAllAndOverride<StaffPermission[]>(STAFF_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      throw new ForbiddenException(
        "This action is not configured for staff access. Contact a maintainer.",
      );
    }

    const allowed = await this.userService.hasAnyPermission(requestUser.id, required);
    if (!allowed) {
      throw new ForbiddenException(
        "You do not have permission for this action. Ask an admin to update your staff role.",
      );
    }

    return true;
  }
}
