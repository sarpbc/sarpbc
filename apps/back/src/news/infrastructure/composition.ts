import type { EntityManager } from "@mikro-orm/postgresql";
import { authorReader } from "../../common/infrastructure/persistence/author-reader";
import { replyDeletion } from "../../reply/infrastructure/composition";
import { MikroNewsStore } from "./persistence/news.store";
import type { NewsTransaction } from "../application/ports";
export function transactionalNews(em: EntityManager): NewsTransaction {
  return {
    run: (work) =>
      em.transactional(async (tx) => {
        const result = await work({
          articles: new MikroNewsStore(tx),
          replies: replyDeletion(tx),
          users: authorReader(tx),
        });
        await tx.flush();
        return result;
      }),
  };
}
