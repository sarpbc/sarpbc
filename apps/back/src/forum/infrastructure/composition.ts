import type { EntityManager } from "@mikro-orm/postgresql";
import { authorReader } from "../../user/infrastructure/user-persistence";
import { replyDeletion } from "../../reply/infrastructure/composition";
import { MikroPostStore } from "./persistence/post.store";
import { MikroTopicStore } from "./persistence/topic.store";
import type { ForumTransaction } from "../application/ports";

export const transactionalForum = (em: EntityManager) =>
  ({
    run: async (work) =>
      await em.transactional(async (tx) => {
        const result = await work({
          posts: new MikroPostStore(tx),
          replies: replyDeletion(tx),
          topics: new MikroTopicStore(tx),
          users: authorReader(tx),
        });

        await tx.flush();

        return result;
      }),
  }) satisfies ForumTransaction;
