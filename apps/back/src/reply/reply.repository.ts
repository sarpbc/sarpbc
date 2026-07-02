import { EntityRepository } from "@mikro-orm/core";
import { Reply } from "../forum/forum.entities";
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
