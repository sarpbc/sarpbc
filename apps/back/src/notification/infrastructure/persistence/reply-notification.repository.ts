import { EntityRepository } from "@mikro-orm/core";

import { REPLY_HAS_TARGET, REPLY_POPULATE } from "../../../reply/infrastructure/reply-persistence";
import type { ReplyNotification } from "./reply-notification.entity";

interface ReplyNotificationReadFilter {
  recipient: { id: string };
  readAt: null;
  id?: { $in: string[] };
}

const hasTarget = () => REPLY_HAS_TARGET.map((target) => ({ reply: target }));

export class ReplyNotificationRepository extends EntityRepository<ReplyNotification> {
  async findForRecipient(recipientId: string, limit: number): Promise<ReplyNotification[]> {
    return await this.findAll({
      where: { recipient: { id: recipientId }, $or: hasTarget() },
      populate: ["reply", ...REPLY_POPULATE.map((relation) => `reply.${relation}` as const)],
      orderBy: { createdAt: "DESC" },
      limit,
    });
  }

  async countUnread(recipientId: string): Promise<number> {
    return await this.count({
      recipient: { id: recipientId },
      readAt: null,
      $or: hasTarget(),
    });
  }

  async markRead(recipientId: string, ids?: string[]): Promise<number> {
    const where: ReplyNotificationReadFilter = {
      recipient: { id: recipientId },
      readAt: null,
    };

    if (ids?.length !== undefined && ids.length !== 0) {
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
