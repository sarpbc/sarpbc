import type { EntityManager } from "@mikro-orm/postgresql";
import { User } from "../../user/infrastructure/persistence/user.entity";
import { replyDeletion } from "../../reply/infrastructure/composition";
import { MikroPostStore, MikroTopicStore } from "./persistence/forum.store";
import type { ForumTransaction } from "../application/ports";
export function transactionalForum(em: EntityManager): ForumTransaction {
  return {
    run: (work) =>
      em.transactional(async (tx) => {
        const result = await work({
          posts: new MikroPostStore(tx),
          topics: new MikroTopicStore(tx),
          replies: replyDeletion(tx),
          users: {
            async findById(id: string) {
              const row = await tx.findOne(User, { id });
              return row ? { id: row.id, userName: row.userName, role: row.role } : null;
            },
          },
        });
        await tx.flush();
        return result;
      }),
  };
}
