import { UserDto } from "./dto/user.dto";
import { User } from "./domain/user.entity";

export class UserMapper {
  static toDto(user: User): UserDto {
    const dto: UserDto = {
      id: user.id,
      email: user.email,
      userName: user.userName,
      avatarUrl: user.avatarUrl ?? undefined,
    };

    if (user.admin === true) {
      dto.admin = true;
    }

    return dto;
  }
}
