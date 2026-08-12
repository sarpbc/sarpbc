import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { UserService } from "./user.service";
import { AuthGuard } from "src/auth/auth.guard";
import { AuthenticatedUserRequest } from "src/common/types/authenticated.interface";
import { CurrentUserId } from "./decorator/current-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";
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

  @UseGuards(AuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch("profile")
  async updateProfile(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto) {
    const user = await this.userService.updateUserName(userId, dto.userName);
    return { user: UserMapper.toDto(user) };
  }
}
