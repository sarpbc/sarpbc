import type { EntityManager } from "@mikro-orm/postgresql";
import { Reply } from "../../forum/infrastructure/persistence/forum.entities";
import { User } from "../../user/infrastructure/persistence/user.entity";
import { ReplyNotification } from "./persistence/reply-notification.entity";
export function directReplyNotifications(em: EntityManager) {
  return {
    async createForDirectReply(recipientId: string, replyId: string) {
      const row = new ReplyNotification();
      row.recipient = em.getReference(User, recipientId);
      row.reply = em.getReference(Reply, replyId);
      row.readAt = null;
      em.persist(row);
    },
  };
}
