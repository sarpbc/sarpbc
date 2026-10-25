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
import { UserService } from "../../application/user.service";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "./decorator/current-user.decorator";
import { RequirePermissions } from "./decorator/require-permissions.decorator";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { PermissionGuard } from "./user.guard";
import { UserMapper } from "./user.mapper";

@Controller("users")
@RequirePermissions("users.manage")
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async list(@Query({ schema: ListUsersQueryDto }) query: ListUsersQueryDto) {
    const { users, total } = await this.userService.list(query);
    return { users: users.map(UserMapper.toListItemDto), total };
  }

  @Patch(":id/role")
  async changeRole(
    @CurrentUserId() actorId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body({ schema: ChangeUserRoleDto }) dto: ChangeUserRoleDto,
  ) {
    const user = await this.userService.changeRole(
      actorId,
      id,
      dto.role === "member" ? null : dto.role,
    );
    return { user: UserMapper.toListItemDto(user) };
  }
}
