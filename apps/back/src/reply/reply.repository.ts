import { EntityRepository } from "@mikro-orm/core";
import { Reply } from "../forum/forum.entities";
import { IReplyRepository } from "./domain/reply.repository.interface";
import type { ReplyTargetType } from "./dto/reply-response.dto";

const POPULATE = ["author", "replyTo", "replyTo.author"] as const;

function targetForeignKey(targetType: ReplyTargetType): string {
  switch (targetType) {
    case "forumPost":
      return "post_id";
    case "newsArticle":
      return "news_article_id";
    case "match":
      return "match_id";
    default: {
      const _exhaustive: never = targetType;
      return _exhaustive;
    }
  }
}

function targetFilter(targetType: ReplyTargetType, targetId: string, includeHidden = false) {
  const hiddenFilter = includeHidden ? {} : { hiddenAt: null };
  switch (targetType) {
    case "forumPost":
      return { post: { id: targetId }, ...hiddenFilter };
    case "newsArticle":
      return { newsArticle: { id: targetId }, ...hiddenFilter };
    case "match":
      return { match: { id: targetId }, ...hiddenFilter };
    default: {
      const _exhaustive: never = targetType;
      return _exhaustive;
    }
  }
}

export class ReplyRepository extends EntityRepository<Reply> implements IReplyRepository {
  async findByPostId(
    postId: string,
    includeHidden = false,
    order: "ASC" | "DESC" = "ASC",
  ): Promise<Reply[]> {
    return this.find(
      {
        post: { id: postId },
        ...(includeHidden ? {} : { hiddenAt: null }),
      },
      { populate: [...POPULATE], orderBy: { createdAt: order } },
    );
  }

  async findByNewsArticleId(
    newsArticleId: string,
    includeHidden = false,
    order: "ASC" | "DESC" = "DESC",
  ): Promise<Reply[]> {
    return this.find(
      {
        newsArticle: { id: newsArticleId },
        ...(includeHidden ? {} : { hiddenAt: null }),
      },
      { populate: [...POPULATE], orderBy: { createdAt: order } },
    );
  }

  async findByMatchId(
    matchId: string,
    includeHidden = false,
    order: "ASC" | "DESC" = "DESC",
  ): Promise<Reply[]> {
    return this.find(
      {
        match: { id: matchId },
        ...(includeHidden ? {} : { hiddenAt: null }),
      },
      { populate: [...POPULATE], orderBy: { createdAt: order } },
    );
  }

  async findById(id: string): Promise<Reply | null> {
    return this.findOne({ id }, { populate: ["author"] });
  }

  async findLatestByUser(userId: string): Promise<Reply | null> {
    return this.findOne({ author: { id: userId } }, { orderBy: { createdAt: "DESC" } });
  }

  async countRootsByTarget(targetType: ReplyTargetType, targetId: string): Promise<number> {
    return this.count({
      ...targetFilter(targetType, targetId),
      replyTo: null,
    });
  }

  async countByTargetIds(
    targetType: ReplyTargetType,
    targetIds: string[],
  ): Promise<Map<string, number>> {
    if (targetIds.length === 0) {
      return new Map();
    }

    const column = targetForeignKey(targetType);
    const knex = this.em.getKnex();
    const rows = (await knex("reply")
      .select({ targetId: column })
      .count("* as count")
      .whereIn(column, targetIds)
      .whereNull("hidden_at")
      .groupBy(column)) as Array<{ targetId: string; count: string | number }>;

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.targetId, Number(row.count));
    }
    return counts;
  }

  async save(reply: Reply): Promise<void> {
    await this.em.persist(reply).flush();
  }

  async delete(reply: Reply): Promise<void> {
    await this.em.remove(reply).flush();
  }

  async findChildren(replyId: string): Promise<Reply[]> {
    return this.find({ replyTo: { id: replyId } });
  }

  async deleteByPostId(postId: string): Promise<void> {
    const replies = await this.find({ post: { id: postId } });
    for (const reply of replies) {
      await this.delete(reply);
    }
  }
}
