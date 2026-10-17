import type { EntityManager } from "@mikro-orm/postgresql";
import { ConflictError } from "../../common/domain/errors";
import { User } from "../../user/infrastructure/persistence/user.entity";
import { replyDeletion } from "../../reply/infrastructure/composition";
import { MikroNewsStore } from "./persistence/news.store";
import type { NewsTransaction } from "../application/ports";
export function transactionalNews(em: EntityManager): NewsTransaction {
  return {
    async run(work) {
      try {
        return await em.transactional(async (tx) => {
          const result = await work({
            articles: new MikroNewsStore(tx),
            replies: replyDeletion(tx),
            users: {
              async findById(id: string) {
                const row = await tx.findOne(User, { id });
                return row ? { id: row.id, userName: row.userName } : null;
              },
            },
          });
          await tx.flush();
          return result;
        });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "UniqueConstraintViolationException" ||
            ("code" in error && error.code === "23505"))
        )
          throw new ConflictError(
            "An article with this slug already exists. Choose a different slug.",
          );
        throw error;
      }
    },
  };
}
