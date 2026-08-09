import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { NotificationService } from "./notification.service";

class ListNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 30;
}

class MarkNotificationsReadDto {
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  ids?: string[];
}

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
