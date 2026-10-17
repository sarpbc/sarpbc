import type { EntityManager } from "@mikro-orm/postgresql";
import { ReplyNotificationRepository } from "./reply-notification.repository";
import { ReplyNotification } from "./reply-notification.entity";
import { replySnapshot } from "../../../reply/infrastructure/persistence/reply.mapper";
import type { NotificationStore } from "../../application/ports";
export class MikroNotificationStore implements NotificationStore {
  private readonly rows: ReplyNotificationRepository;
  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository<ReplyNotification, ReplyNotificationRepository>(ReplyNotification);
  }
  async findForRecipient(id: string, limit: number) {
    return (await this.rows.findForRecipient(id, limit)).map((row) => ({
      id: row.id,
      createdAt: new Date(row.createdAt),
      readAt: row.readAt ? new Date(row.readAt) : null,
      reply: replySnapshot(row.reply),
    }));
  }
  countUnread(id: string) {
    return this.rows.countUnread(id);
  }
  markRead(id: string, ids?: string[]) {
    return this.em.transactional(async (em) => {
      const rows = em.getRepository<ReplyNotification, ReplyNotificationRepository>(
        ReplyNotification,
      );
      const result = await rows.markRead(id, ids);
      await em.flush();
      return result;
    });
  }
}
