import { EntityRepository } from "@mikro-orm/postgresql";
import { Reply } from "./domain/reply.entity";
import { IReplyRepository } from "./domain/reply.repository.interface";

export class ReplyRepository extends EntityRepository<Reply> implements IReplyRepository {
  async findByPostId(postId: string): Promise<Reply[]> {
    return this.find(
      { post: { id: postId } },
      { populate: ["author", "replyTo", "replyTo.author"] },
    );
  }

  async findByNewsArticleId(newsArticleId: string): Promise<Reply[]> {
    return this.find(
      { newsArticle: { id: newsArticleId } },
      { populate: ["author", "replyTo", "replyTo.author"] },
    );
  }

  async findById(id: string): Promise<Reply | null> {
    return this.findOne({ id });
  }

  async hasRecentReplyByUser(userId: string, sinceDate: Date): Promise<boolean> {
    const count = await this.count({
      author: { id: userId },
      createdAt: { $gte: sinceDate },
    } as any);
    return count > 0;
  }

  async save(reply: Reply): Promise<void> {
    await this.em.persistAndFlush(reply);
  }
}
