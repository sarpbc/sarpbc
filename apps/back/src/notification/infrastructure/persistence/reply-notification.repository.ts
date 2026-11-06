import { EntityRepository } from "@mikro-orm/core";

import { REPLY_POPULATE } from "../../../reply/infrastructure/persistence/reply.mapper";
import { ReplyNotification } from "./reply-notification.entity";

interface ReplyNotificationReadFilter {
  recipient: { id: string };
  readAt: null;
  id?: { $in: string[] };
}

export class ReplyNotificationRepository extends EntityRepository<ReplyNotification> {
  async findForRecipient(recipientId: string, limit: number): Promise<ReplyNotification[]> {
    return this.find(
      { recipient: { id: recipientId } },
      {
        populate: ["reply", ...REPLY_POPULATE.map((relation) => `reply.${relation}` as const)],
        orderBy: { createdAt: "DESC" },
        limit,
      },
    );
  }

  async countUnread(recipientId: string): Promise<number> {
    return this.count({
      recipient: { id: recipientId },
      readAt: null,
    });
  }

  async markRead(recipientId: string, ids?: string[]): Promise<number> {
    const where: ReplyNotificationReadFilter = {
      recipient: { id: recipientId },
      readAt: null,
    };
    if (ids?.length) {
      where.id = { $in: ids };
    }

    const notifications = await this.find(where);
    const now = new Date();
    for (const notification of notifications) {
      notification.readAt = now;
    }

    return notifications.length;
  }
}
