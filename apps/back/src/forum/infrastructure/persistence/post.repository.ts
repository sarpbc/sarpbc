import { z } from "zod";
import { EntityRepository } from "@mikro-orm/core";

import type { EntityRef } from "../../../common/domain/entity-ref";
import { Post } from "./post.entity";

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
      orderBy: { createdAt: "DESC" },
      populate: ["author", "topic"],
    });
  }

  async findByTopicId(topicId: string): Promise<Post[]> {
    return await super.findAll({
      populate: ["author", "topic"],
      where: { topic: { id: topicId } },
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
          last_activity: z.coerce.date(),
          public_id: z.number().int().positive(),
          reply_count: z.coerce.number().int().nonnegative(),
          title: z.string(),
        }),
      )
      .parse(results);

    return rows.map((row) => ({
      id: row.id,
      lastActivity: row.last_activity,
      messageCount: row.reply_count + 1,
      publicId: row.public_id,
      title: row.title,
    }));
  }

  async findLatestByUser(userId: string): Promise<Post | null> {
    return await this.findOne(
      { author: { id: userId } },
      { orderBy: { createdAt: "DESC" }, populate: ["author", "topic"] },
    );
  }
}
