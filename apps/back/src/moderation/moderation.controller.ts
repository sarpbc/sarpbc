import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import { ModerationService } from "./moderation.service";

class ListModerationRepliesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

@Controller("moderation")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("forum.moderate")
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get("replies")
  async listReplies(@Query() query: ListModerationRepliesQueryDto) {
    const replies = await this.moderationService.listRecentReplies(query.limit);
    return { replies };
  }
}
