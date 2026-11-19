import type { NotificationStore, NotificationRecord } from "./ports";
import type { NotificationDto } from "./notification.view";
import { resolveReplyTargetLink } from "../../reply/domain/reply";
import type { ReplyTargetLink } from "../../reply/domain/reply";

const targetFields = (target: ReplyTargetLink) => ({
  targetId: target.targetId,
  targetLabel: target.targetLabel,
  targetPath: target.targetPath,
  targetType: target.targetType,
});

const toNotificationDto = (notification: NotificationRecord) => {
  const target = resolveReplyTargetLink(notification.reply);

  if (!target) {
    return null;
  }

  return {
    createdAt: notification.createdAt,
    id: notification.id,
    readAt: notification.readAt,
    reply: {
      author: {
        userName: notification.reply.author.userName,
      },
      content: notification.reply.content,
      id: notification.reply.id,
    },
    ...targetFields(target),
  };
};

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationStore) {}

  async listForUser(userId: string, limit: number) {
    const notifications = await this.notificationRepository.findForRecipient(userId, limit);

    return notifications
      .map((notification) => toNotificationDto(notification))
      .filter((item): item is NotificationDto => item !== null);
  }

  async getUnreadCount(userId: string) {
    return await this.notificationRepository.countUnread(userId);
  }

  async markRead(userId: string, ids?: string[]) {
    const marked = await this.notificationRepository.markRead(userId, ids);

    return { marked };
  }
}
