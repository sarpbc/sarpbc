import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { ListModerationRepliesQueryDto } from "./dto/list-moderation-replies-query.dto";
import { ModerationService } from "../../application/moderation.service";

@Controller("moderation")
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermissions("forum.moderate")
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get("replies")
  async listReplies(
    @Query({ schema: ListModerationRepliesQueryDto }) query: ListModerationRepliesQueryDto,
  ) {
    const replies = await this.moderationService.listRecentReplies(query.limit);
    return { replies };
  }
}
