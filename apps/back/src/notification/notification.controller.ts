import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { MarkNotificationsReadDto } from "./dto/mark-notifications-read.dto";
import { NotificationService } from "./notification.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@CurrentUserId() userId: string, @Query() query: ListNotificationsQueryDto) {
    const notifications = await this.notificationService.listForUser(userId, query.limit);
    return { notifications };
  }

  @Get("unread-count")
  async unreadCount(@CurrentUserId() userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Patch("read")
  async markRead(@CurrentUserId() userId: string, @Body() body: MarkNotificationsReadDto) {
    const result = await this.notificationService.markRead(userId, body.ids);
    return result;
  }
}
