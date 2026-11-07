import type { User as UserResponse, UserListItem } from "@sarpbc/types";
import type { User } from "../../domain/user";
import { isStaffRole, permissionsForRole } from "../../domain/staff-access";

export class UserMapper {
  static toDto(user: User): UserResponse {
    const dto: UserResponse = {
      id: user.id,
      email: user.email,
      userName: user.userName,
      avatarUrl: user.avatarUrl ?? undefined,
    };

    if (isStaffRole(user.role)) {
      dto.role = user.role;
      dto.permissions = [...permissionsForRole(user.role)];
    }

    return dto;
  }

  static toListItemDto(user: User): UserListItem {
    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      avatarUrl: user.avatarUrl,
      role: isStaffRole(user.role) ? user.role : null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
