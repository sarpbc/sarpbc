import type { NotificationStore, NotificationRecord } from "./ports";
import type { NotificationDto } from "./notification.view";
import { resolveReplyTargetLink, type ReplyTargetLink } from "../../reply/domain/reply";

function targetFields(
  target: ReplyTargetLink,
): Pick<NotificationDto, "targetType" | "targetId" | "targetLabel" | "targetPath"> {
  return {
    targetType: target.targetType,
    targetId: target.targetId,
    targetLabel: target.targetLabel,
    targetPath: target.targetPath,
  };
}

function toNotificationDto(notification: NotificationRecord): NotificationDto | null {
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
    ...targetFields(target),
  };
}

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationStore) {}

  async listForUser(userId: string, limit: number): Promise<NotificationDto[]> {
    const notifications = await this.notificationRepository.findForRecipient(userId, limit);

    return notifications
      .map((notification) => toNotificationDto(notification))
      .filter((item): item is NotificationDto => item !== null);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.countUnread(userId);
  }

  async markRead(userId: string, ids?: string[]): Promise<{ marked: number }> {
    const marked = await this.notificationRepository.markRead(userId, ids);

    return { marked };
  }
}
