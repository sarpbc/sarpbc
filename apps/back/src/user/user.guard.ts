import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { AuthenticatedRequest } from "src/common/types/authenticated.interface";
import { UserService } from "./user.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: AuthenticatedRequest = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestUser = request.user;

    if (!requestUser) {
      throw new ForbiddenException();
    }

    if ((await this.userService.isAdmin(requestUser.id)) !== true) {
      throw new ForbiddenException();
    }
    return true;
  }
}
