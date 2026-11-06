import type { EntityManager } from "@mikro-orm/postgresql";
import { authorReader } from "../../user/infrastructure/user-persistence";
import { directReplyNotifications } from "../../notification/infrastructure/composition";
import { ReplyService } from "../application/reply.service";
import type { ReplyTransaction, ReplyWriteScope } from "../application/ports";
import type { ReplyTarget } from "../domain/reply";
import { REPLY_TARGET_LOADERS } from "./persistence/reply.mapper";
import { MikroReplyStore, replyReports } from "./persistence/reply.store";
export function replyWriteScope(em: EntityManager): ReplyWriteScope {
  return {
    replies: new MikroReplyStore(em),
    reports: replyReports(em),
    notifications: directReplyNotifications(em),
    users: authorReader(em),
    targets: {
      async find(target: ReplyTarget) {
        const found = await REPLY_TARGET_LOADERS[target.kind](em, target.id);
        return found && { post: null, newsArticle: null, match: null, ...found };
      },
    },
  };
}
export function transactionalReplies(em: EntityManager): ReplyTransaction {
  return {
    run: (work) =>
      em.transactional(async (tx) => {
        const result = await work(replyWriteScope(tx));
        await tx.flush();
        return result;
      }),
  };
}
// The caller already owns the transaction; never open an independent unit of work.
export function replyDeletion(em: EntityManager) {
  const scope = replyWriteScope(em);
  const service = new ReplyService(scope.replies, { run: (work) => work(scope) });
  return {
    deleteAllForPost: (id: string) => service.deleteAllForTarget("forumPost", id),
    deleteAllForTarget: (type: ReplyTarget["kind"], id: string) =>
      service.deleteAllForTarget(type, id),
  };
}
