import { EntityRepository } from "@mikro-orm/core";
import { Reply } from "../forum/forum.entities";
import { IReplyRepository } from "./domain/reply.repository.interface";

const POPULATE = ["author", "replyTo", "replyTo.author"] as const;

export class ReplyRepository extends EntityRepository<Reply> implements IReplyRepository {
  async findByPostId(postId: string, includeHidden = false): Promise<Reply[]> {
    return this.find(
      {
        post: { id: postId },
        ...(includeHidden ? {} : { hiddenAt: null }),
      },
      { populate: [...POPULATE] },
    );
  }

  async findByNewsArticleId(newsArticleId: string, includeHidden = false): Promise<Reply[]> {
    return this.find(
      {
        newsArticle: { id: newsArticleId },
        ...(includeHidden ? {} : { hiddenAt: null }),
      },
      { populate: [...POPULATE] },
    );
  }

  async findByMatchId(matchId: string, includeHidden = false): Promise<Reply[]> {
    return this.find(
      {
        match: { id: matchId },
        ...(includeHidden ? {} : { hiddenAt: null }),
      },
      { populate: [...POPULATE] },
    );
  }

  async findById(id: string): Promise<Reply | null> {
    return this.findOne({ id }, { populate: ["author"] });
  }

  async findLatestByUser(userId: string): Promise<Reply | null> {
    return this.findOne({ author: { id: userId } }, { orderBy: { createdAt: "DESC" } });
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

  async findRecentForModeration(limit: number): Promise<Reply[]> {
    return this.find(
      {},
      {
        populate: ["author", "post", "newsArticle", "match"],
        orderBy: { createdAt: "DESC" },
        limit,
      },
    );
  }

  async deleteByPostId(postId: string): Promise<void> {
    const replies = await this.find({ post: { id: postId } });
    for (const reply of replies) {
      await this.delete(reply);
    }
  }
}
