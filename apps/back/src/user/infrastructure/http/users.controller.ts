import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { UserList } from "@sarpbc/types";
import { UserService } from "../../application/user.service";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "./decorator/current-user.decorator";
import { RequirePermissions } from "./decorator/require-permissions.decorator";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import type { ChangeUserRoleInput } from "./dto/change-user-role.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import type { ListUsersQueryInput } from "./dto/list-users-query.dto";
import { PermissionGuard } from "./user.guard";
import { toUserListItem } from "./user.mapper";

@Controller("users")
@RequirePermissions("users.manage")
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async list(@Query({ schema: ListUsersQueryDto }) query: ListUsersQueryInput): Promise<UserList> {
    const { users, total } = await this.userService.list(query);

    return { users: users.map((user) => toUserListItem(user)), total };
  }

  @Patch(":id/role")
  async changeRole(
    @CurrentUserId() actorId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: ChangeUserRoleDto }) dto: ChangeUserRoleInput,
  ) {
    const user = await this.userService.changeRole(
      actorId,
      id,
      dto.role === "member" ? null : dto.role,
    );

    return { user: toUserListItem(user) };
  }
}
