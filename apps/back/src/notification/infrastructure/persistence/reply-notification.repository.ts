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
  async findForRecipient(recipientId: string, limit: number) {
    return await this.findAll({
      limit,
      orderBy: { createdAt: "DESC" },
      populate: ["reply", ...REPLY_POPULATE.map((relation) => `reply.${relation}` as const)],
      where: { $or: hasTarget(), recipient: { id: recipientId } },
    });
  }

  async countUnread(recipientId: string) {
    return await this.count({
      $or: hasTarget(),
      readAt: null,
      recipient: { id: recipientId },
    });
  }

  async markRead(recipientId: string, ids?: string[]) {
    const where: ReplyNotificationReadFilter = {
      readAt: null,
      recipient: { id: recipientId },
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
