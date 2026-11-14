import { Body, Controller, Get, Patch, Request, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { UserService } from "../../application/user.service";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { AuthenticatedUserRequest } from "../../../common/infrastructure/http/types/authenticated.interface";
import { CurrentUserId } from "./decorator/current-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import type { UpdateProfileInput } from "./dto/update-profile.dto";
import { toUserResponse } from "./user.mapper";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get("profile")
  async getProfile(@Request() req: AuthenticatedUserRequest) {
    const user = await this.userService.findOneByEmail(req.user.email);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const userDto = toUserResponse(user);

    return { user: userDto };
  }

  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch("profile")
  async updateProfile(
    @CurrentUserId() userId: string,
    @Body({ schema: UpdateProfileDto }) dto: UpdateProfileInput,
  ) {
    const user = await this.userService.updateUserName(userId, dto.userName);

    return { user: toUserResponse(user) };
  }
}
