import { EntityRepository } from "@mikro-orm/core";
import { Post, PostTranslation } from "../forum.entities";
import { IPostRepository } from "./domain/post.repository.interface";

export class PostRepository extends EntityRepository<Post> implements IPostRepository {
  async findPaginated({
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<Post[]> {
    return super.find(
      {},
      { limit, offset, populate: ["author", "topic"], orderBy: { createdAt: "DESC" } },
    );
  }

  async findByTopicId(topicId: string): Promise<Post[]> {
    return super.find({ topic: { id: topicId } }, { populate: ["author"] });
  }

  async findById(id: string): Promise<Post | null> {
    return this.findOne({ id });
  }

  async findWithDetails(id: string): Promise<Post | null> {
    return this.findOne(
      { id },
      {
        populate: [
          "author",
          "topic",
          "replies",
          "replies.author",
          "replies.replyTo",
          "translations",
        ],
      },
    );
  }

  async findRecentActivity(limit: number): Promise<
    Array<{
      id: string;
      title: string;
      messageCount: number;
      lastActivity: Date;
    }>
  > {
    const query = `
      SELECT
        p.id,
        p.title,
        p.created_at,
        COALESCE(MAX(r.created_at), p.created_at) as last_activity,
        COUNT(r.id) as reply_count
      FROM post p
      LEFT JOIN reply r ON p.id = r.post_id
      GROUP BY p.id, p.title, p.created_at
      ORDER BY COALESCE(MAX(r.created_at), p.created_at) DESC
      LIMIT ${limit}
    `;
    const results = await this.em.getConnection().execute(query);
    return results.map((row: any) => ({
      id: row.id,
      title: row.title,
      messageCount: parseInt(row.reply_count, 10) + 1,
      lastActivity: new Date(row.last_activity),
    }));
  }

  async hasRecentPostByUser(userId: string, sinceDate: Date): Promise<boolean> {
    const count = await this.count({
      author: { id: userId },
      createdAt: { $gte: sinceDate },
    } as any);
    return count > 0;
  }

  async save(post: Post): Promise<void> {
    await this.em.persist(post).flush();
  }

  async saveTranslation(translation: PostTranslation): Promise<void> {
    await this.em.remove(translation).flush();
  }

  async delete(post: Post): Promise<void> {
    await this.em.remove(post).flush();
  }
}
