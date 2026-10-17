import { UserDto } from "./dto/user.dto";
import type { User } from "../../domain/user";
import { isStaffRole, permissionsForRole } from "../../domain/staff-access";

export class UserMapper {
  static toDto(user: User): UserDto {
    const dto: UserDto = {
      id: user.id,
      email: user.email,
      userName: user.userName,
      avatarUrl: user.avatarUrl ?? undefined,
    };

    if (isStaffRole(user.role)) {
      dto.role = user.role;
      dto.permissions = [...permissionsForRole(user.role)];
      if (user.role === "admin") {
        dto.admin = true;
      }
    }

    return dto;
  }
}
