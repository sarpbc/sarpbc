import type { EntityManager } from "@mikro-orm/postgresql";
import { authorReader } from "../../user/infrastructure/user-persistence";
import { replyDeletion } from "../../reply/infrastructure/composition";
import { MikroNewsStore } from "./persistence/news.store";
import type { NewsTransaction } from "../application/ports";

export const transactionalNews = (em: EntityManager): NewsTransaction => ({
  run: async (work) =>
    await em.transactional(async (tx) => {
      const result = await work({
        articles: new MikroNewsStore(tx),
        replies: replyDeletion(tx),
        users: authorReader(tx),
      });

      await tx.flush();

      return result;
    }),
});
