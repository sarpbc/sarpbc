import { z } from "zod";
import { EntityRepository } from "@mikro-orm/core";

import type { EntityRef } from "../../../common/domain/entity-ref";
import type { Post } from "./post.entity";

export class PostRepository extends EntityRepository<Post> {
  async findPaginated({
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  }): Promise<Post[]> {
    return await super.findAll({
      limit,
      offset,
      populate: ["author", "topic"],
      orderBy: { createdAt: "DESC" },
    });
  }

  async findByTopicId(topicId: string): Promise<Post[]> {
    return await super.findAll({
      where: { topic: { id: topicId } },
      populate: ["author", "topic"],
    });
  }

  async findById(id: string): Promise<Post | null> {
    return await this.findOne({ id }, { populate: ["author", "topic"] });
  }

  async findWithDetails(ref: EntityRef): Promise<Post | null> {
    return await this.findOne(
      ref.kind === "publicId" ? { publicId: ref.value } : { id: ref.value },
      {
        populate: ["author", "topic", "translations"],
      },
    );
  }

  async findRecentActivity(limit: number): Promise<
    {
      id: string;
      publicId: number;
      title: string;
      messageCount: number;
      lastActivity: Date;
    }[]
  > {
    const query = `
      SELECT
        p.id,
        p.public_id,
        p.title,
        p.created_at,
        COALESCE(MAX(r.created_at), p.created_at) as last_activity,
        COUNT(r.id) as reply_count
      FROM post p
      LEFT JOIN reply r ON p.id = r.post_id
      GROUP BY p.id, p.public_id, p.title, p.created_at
      ORDER BY COALESCE(MAX(r.created_at), p.created_at) DESC
      LIMIT ?
    `;

    const results: unknown = await this.em.getConnection().execute(query, [limit]);

    const rows = z
      .array(
        z.object({
          id: z.string(),
          public_id: z.number().int().positive(),
          title: z.string(),
          reply_count: z.coerce.number().int().nonnegative(),
          last_activity: z.coerce.date(),
        }),
      )
      .parse(results);

    return rows.map((row) => ({
      id: row.id,
      publicId: row.public_id,
      title: row.title,
      messageCount: row.reply_count + 1,
      lastActivity: row.last_activity,
    }));
  }

  async findLatestByUser(userId: string): Promise<Post | null> {
    return await this.findOne(
      { author: { id: userId } },
      { populate: ["author", "topic"], orderBy: { createdAt: "DESC" } },
    );
  }
}
