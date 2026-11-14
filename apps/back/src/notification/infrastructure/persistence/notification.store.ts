import type { EntityManager } from "@mikro-orm/postgresql";
import type { ReplyNotificationRepository } from "./reply-notification.repository";
import { ReplyNotification } from "./reply-notification.entity";
import { replySnapshot } from "../../../reply/infrastructure/reply-persistence";
import type { NotificationStore } from "../../application/ports";

export class MikroNotificationStore implements NotificationStore {
  private readonly rows: ReplyNotificationRepository;
  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository<ReplyNotification, ReplyNotificationRepository>(ReplyNotification);
  }
  async findForRecipient(id: string, limit: number) {
    const rows = await this.rows.findForRecipient(id, limit);

    return rows.map((row) => ({
      id: row.id,
      createdAt: new Date(row.createdAt),
      readAt: row.readAt ? new Date(row.readAt) : null,
      reply: replySnapshot(row.reply),
    }));
  }
  async countUnread(id: string) {
    return await this.rows.countUnread(id);
  }
  async markRead(id: string, ids?: string[]) {
    return await this.em.transactional(async (em) => {
      const rows = em.getRepository<ReplyNotification, ReplyNotificationRepository>(
        ReplyNotification,
      );

      const result = await rows.markRead(id, ids);
      await em.flush();

      return result;
    });
  }
}
