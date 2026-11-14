import type { EntityManager } from "@mikro-orm/postgresql";
import { authorReader } from "../../user/infrastructure/user-persistence";
import { replyDeletion } from "../../reply/infrastructure/composition";
import { MikroPostStore, MikroTopicStore } from "./persistence/forum.store";
import type { ForumTransaction } from "../application/ports";

export function transactionalForum(em: EntityManager): ForumTransaction {
  return {
    run: async (work) =>
      await em.transactional(async (tx) => {
        const result = await work({
          posts: new MikroPostStore(tx),
          topics: new MikroTopicStore(tx),
          replies: replyDeletion(tx),
          users: authorReader(tx),
        });

        await tx.flush();

        return result;
      }),
  };
}
