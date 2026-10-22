import type { EntityManager } from "@mikro-orm/postgresql";
import { ConflictError } from "../../common/domain/errors";
import { Post } from "../../forum/infrastructure/persistence/forum.entities";
import { NewsArticle } from "../../news/infrastructure/persistence/news-article.entity";
import { Match } from "../../tournament/infrastructure/persistence/tournament.entities";
import { toMatchSlug } from "../../tournament/infrastructure/persistence/competition.mapper";
import { MATCH_TOURNAMENT_POPULATE } from "../../tournament/infrastructure/persistence/match-populate";
import { User } from "../../user/infrastructure/persistence/user.entity";
import { directReplyNotifications } from "../../notification/infrastructure/composition";
import { FORUM_ERROR_CODES } from "../../forum/domain/forum.constants";
import { ReplyService } from "../application/reply.service";
import type { ReplyTransaction, ReplyWriteScope } from "../application/ports";
import type { ReplyTarget } from "../domain/reply";
import { MikroReplyStore, replyReports } from "./persistence/reply.store";
export function replyWriteScope(em: EntityManager): ReplyWriteScope {
  return {
    replies: new MikroReplyStore(em),
    reports: replyReports(em),
    notifications: directReplyNotifications(em),
    users: {
      async findById(id: string) {
        const user = await em.findOne(User, { id });
        return user ? { id: user.id, userName: user.userName, role: user.role } : null;
      },
    },
    targets: {
      async find(target: ReplyTarget) {
        switch (target.kind) {
          case "forumPost": {
            const row = await em.findOne(Post, { id: target.id });
            return row
              ? {
                  post: { id: row.id, publicId: row.publicId, title: row.title },
                  newsArticle: null,
                  match: null,
                }
              : null;
          }
          case "newsArticle": {
            const row = await em.findOne(NewsArticle, { id: target.id });
            return row
              ? {
                  post: null,
                  newsArticle: { id: row.id, title: row.title, slug: row.slug },
                  match: null,
                }
              : null;
          }
          case "match": {
            const row = await em.findOne(
              Match,
              { id: target.id },
              { populate: ["participants.team", ...MATCH_TOURNAMENT_POPULATE] },
            );
            return row
              ? {
                  post: null,
                  newsArticle: null,
                  match: {
                    id: row.id,
                    publicId: row.publicId,
                    name: row.name,
                    slug: toMatchSlug(row),
                  },
                }
              : null;
          }
          default: {
            const unreachable: never = target.kind;
            return unreachable;
          }
        }
      },
    },
  };
}
export function transactionalReplies(em: EntityManager): ReplyTransaction {
  return {
    async run(work) {
      let deletingReply = false;
      try {
        return await em.transactional(async (tx) => {
          const scope = replyWriteScope(tx);
          const deleteReply = scope.replies.delete.bind(scope.replies);
          scope.replies.delete = async (reply) => {
            deletingReply = true;
            await deleteReply(reply);
          };
          const result = await work(scope);
          await tx.flush();
          return result;
        });
      } catch (error) {
        if (
          deletingReply &&
          error instanceof Error &&
          (("code" in error && error.code === "23503") ||
            error.name === "ForeignKeyConstraintViolationException")
        )
          throw new ConflictError(
            "This comment could not be deleted because it is still referenced. Hide it instead.",
          );
        if (
          error instanceof Error &&
          "constraint" in error &&
          error.constraint === "reply_report_reply_id_reporter_id_index" &&
          (("code" in error && error.code === "23505") ||
            error.name === "UniqueConstraintViolationException")
        )
          throw new ConflictError({
            message: "You already reported this comment.",
            code: FORUM_ERROR_CODES.REPLY_ALREADY_REPORTED,
          });
        throw error;
      }
    },
  };
}
// The caller already owns the transaction; never open an independent unit of work.
export function replyDeletion(em: EntityManager) {
  const scope = replyWriteScope(em);
  const service = new ReplyService(scope.replies, { run: (work) => work(scope) });
  return {
    deleteAllForPost: (id: string) => service.deleteAllForPost(id),
    deleteAllForTarget: (type: ReplyTarget["kind"], id: string) =>
      service.deleteAllForTarget(type, id),
  };
}
