import { Injectable } from "@nestjs/common";
import { Reply } from "../forum/forum.entities";
import { User } from "../user/domain/user.entity";
import { resolveReplyTargetLink } from "../reply/reply-target-link.util";
import type { ReplyTargetLink } from "../reply/reply-target-link.util";
import { ReplyNotificationRepository } from "./reply-notification.repository";
import { ReplyNotification } from "./reply-notification.entity";
import type { NotificationDto } from "./dto/notification.dto";

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: ReplyNotificationRepository) {}

  async createForDirectReply(recipient: User, reply: Reply): Promise<void> {
    const notification = new ReplyNotification();
    notification.recipient = recipient;
    notification.reply = reply;
    notification.readAt = null;

    await this.notificationRepository.save(notification);
  }

  async listForUser(userId: string, limit = 30): Promise<NotificationDto[]> {
    const cappedLimit = Math.min(Math.max(limit, 1), 50);
    const notifications = await this.notificationRepository.findForRecipient(userId, cappedLimit);

    return notifications
      .map((notification) => this.toDto(notification))
      .filter((item): item is NotificationDto => item !== null);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markRead(userId: string, ids?: string[]): Promise<{ marked: number }> {
    const marked = await this.notificationRepository.markRead(userId, ids);
    return { marked };
  }

  private toDto(notification: ReplyNotification): NotificationDto | null {
    const target = resolveReplyTargetLink(notification.reply);
    if (!target) {
      return null;
    }

    return {
      id: notification.id,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      reply: {
        id: notification.reply.id,
        content: notification.reply.content,
        author: {
          userName: notification.reply.author.userName,
        },
      },
      ...this.targetFields(target),
    };
  }

  private targetFields(
    target: ReplyTargetLink,
  ): Pick<NotificationDto, "targetType" | "targetId" | "targetLabel" | "targetPath"> {
    return {
      targetType: target.targetType,
      targetId: target.targetId,
      targetLabel: target.targetLabel,
      targetPath: target.targetPath,
    };
  }
}
