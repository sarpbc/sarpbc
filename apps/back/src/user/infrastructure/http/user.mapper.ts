import type { User as UserResponse, UserListItem } from "@sarpbc/types";
import type { User } from "../../domain/user";
import { isStaffRole, permissionsForRole } from "../../domain/staff-access";

export const toUserResponse = (user: User) => {
  const dto: UserResponse = {
    avatarUrl: user.avatarUrl ?? undefined,
    email: user.email,
    id: user.id,
    userName: user.userName,
  };

  if (isStaffRole(user.role)) {
    dto.role = user.role;
    dto.permissions = [...permissionsForRole(user.role)];
  }

  return dto satisfies UserResponse;
};

export const toUserListItem = (user: User) =>
  ({
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    email: user.email,
    id: user.id,
    role: isStaffRole(user.role) ? user.role : null,
    userName: user.userName,
  }) satisfies UserListItem;
