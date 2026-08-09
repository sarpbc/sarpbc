import { Injectable } from "@nestjs/common";
import { Reply } from "../forum/forum.entities";
import { User } from "../user/domain/user.entity";
import type { ReplyTargetType } from "../reply/dto/reply-response.dto";
import { ReplyNotificationRepository } from "./reply-notification.repository";
import { ReplyNotification } from "./reply-notification.entity";

export type NotificationDto = {
  id: string;
  createdAt: Date;
  readAt: Date | null;
  reply: {
    id: string;
    content: string;
    author: {
      userName: string;
    };
  };
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
};

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: ReplyNotificationRepository) {}

  async createForDirectReply(recipient: User, reply: Reply): Promise<void> {
    const notification = new ReplyNotification();
    notification.recipient = recipient;
    notification.reply = reply;
    notification.readAt = null;

    await this.notificationRepository.getEntityManager().persist(notification).flush();
  }

  async listForUser(userId: string, limit = 30): Promise<NotificationDto[]> {
    const cappedLimit = Math.min(Math.max(limit, 1), 50);
    const notifications = await this.notificationRepository.findForRecipient(userId, cappedLimit);
    return notifications.map((notification) => this.toDto(notification));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markRead(userId: string, ids?: string[]): Promise<{ marked: number }> {
    const marked = await this.notificationRepository.markRead(userId, ids);
    return { marked };
  }

  private toDto(notification: ReplyNotification): NotificationDto {
    const target = this.resolveTarget(notification.reply);

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
      targetType: target.targetType,
      targetId: target.targetId,
      targetLabel: target.targetLabel,
      targetPath: target.targetPath,
    };
  }

  private resolveTarget(reply: Reply): {
    targetType: ReplyTargetType;
    targetId: string;
    targetLabel: string;
    targetPath: string;
  } {
    if (reply.post) {
      return {
        targetType: "forumPost",
        targetId: reply.post.id,
        targetLabel: reply.post.title,
        targetPath: `/forum/post/${reply.post.id}`,
      };
    }

    if (reply.newsArticle) {
      return {
        targetType: "newsArticle",
        targetId: reply.newsArticle.id,
        targetLabel: reply.newsArticle.title,
        targetPath: `/news/${reply.newsArticle.slug}`,
      };
    }

    if (reply.match) {
      return {
        targetType: "match",
        targetId: reply.match.id,
        targetLabel: reply.match.name,
        targetPath: `/matches/${reply.match.id}`,
      };
    }

    return {
      targetType: "forumPost",
      targetId: "",
      targetLabel: "Unknown",
      targetPath: "/",
    };
  }
}
