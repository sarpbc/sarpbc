import { Controller, Get, NotFoundException, Request, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { AuthGuard } from "src/auth/auth.guard";
import { AuthenticatedUserRequest } from "src/common/types/authenticated.interface";
import { UserMapper } from "./user.mapper";

@Controller("user")
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get("profile")
  async getProfile(@Request() req: AuthenticatedUserRequest) {
    const user = await this.userService.findOneByEmail(req.user.email);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userDto = UserMapper.toDto(user);
    return { user: userDto };
  }
}
