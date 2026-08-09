import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import { ListModerationRepliesQueryDto } from "./dto/list-moderation-replies-query.dto";
import { ModerationService } from "./moderation.service";

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
