import type { NotificationStore, NotificationRecord } from "./ports";
import type { NotificationDto } from "./notification.view";
import { resolveReplyTargetLink } from "../../reply/domain/reply-target-link.util";
import type { ReplyTargetLink } from "../../reply/domain/reply-target-link.util";

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationStore) {}

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

  private toDto(notification: NotificationRecord): NotificationDto | null {
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
