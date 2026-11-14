import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import type { AppNotification } from "@sarpbc/types";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { MarkNotificationsReadDto } from "./dto/mark-notifications-read.dto";
import { NotificationService } from "../../application/notification.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Query({ schema: ListNotificationsQueryDto }) query: ListNotificationsQueryDto,
  ): Promise<{ notifications: AppNotification[] }> {
    const notifications = await this.notificationService.listForUser(userId, query.limit);

    return {
      notifications: notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt?.toISOString() ?? null,
      })),
    };
  }

  @Get("unread-count")
  async unreadCount(@CurrentUserId() userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);

    return { count };
  }

  @Patch("read")
  async markRead(
    @CurrentUserId() userId: string,
    @Body({ schema: MarkNotificationsReadDto }) body: MarkNotificationsReadDto,
  ) {
    const result = await this.notificationService.markRead(userId, body.ids);

    return result;
  }
}
