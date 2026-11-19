import type { EntityManager } from "@mikro-orm/postgresql";
import { QueryOrder } from "@mikro-orm/core";
import type { FilterQuery } from "@mikro-orm/core";
import { z } from "zod";
import type { ReplyTargetType } from "@sarpbc/types";
import type { ReplyFindOptions } from "../../application/ports";
import { REPLY_TARGETS, replySortOrder } from "../../domain/reply";
import { Reply } from "./reply.entity";
import { REPLY_POPULATE } from "./reply.mapper";

type ReplyTargetMatch = { id: string } | { $in: string[] };

const onTarget = (targetType: ReplyTargetType, target: ReplyTargetMatch) => ({
  [REPLY_TARGETS[targetType].field]: target,
});

const moderationRows = z.array(z.object({ id: z.string(), report_count: z.coerce.number() }));

export class ReplyRepository {
  private readonly rows;

  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository(Reply);
  }
  async findByTarget(
    targetType: ReplyTargetType,
    targetId: string,
    options: ReplyFindOptions = {},
  ) {
    const { includeHidden = false, limit, offset, rootsOnly = false } = options;

    const where: FilterQuery<Reply> = onTarget(targetType, { id: targetId });

    if (!includeHidden) {
      where.hiddenAt = null;
    }

    if (rootsOnly) {
      where.replyTo = null;
    }

    return await this.rows.findAll({
      limit,
      offset,
      orderBy: { createdAt: replySortOrder(targetType) },
      populate: [...REPLY_POPULATE],
      where,
    });
  }

  async findById(id: string) {
    return await this.rows.findOne({ id }, { populate: [...REPLY_POPULATE] });
  }

  async findLatestByUser(userId: string) {
    return await this.rows.findOne(
      { author: { id: userId } },
      { orderBy: { createdAt: QueryOrder.DESC }, populate: [...REPLY_POPULATE] },
    );
  }

  async countRootsByTarget(targetType: ReplyTargetType, targetId: string) {
    return await this.rows.count({
      ...onTarget(targetType, { id: targetId }),
      hiddenAt: null,
      replyTo: null,
    });
  }

  async countByTargetIds(targetType: ReplyTargetType, targetIds: string[]) {
    if (targetIds.length === 0) {
      return new Map();
    }

    const countsDict = await this.rows.countBy(REPLY_TARGETS[targetType].field, {
      where: { ...onTarget(targetType, { $in: targetIds }), hiddenAt: null },
    });

    const counts = new Map<string, number>();

    for (const [targetId, count] of Object.entries(countsDict)) {
      counts.set(targetId, count);
    }

    return counts;
  }

  async findDescendantsForRoots(targetType: ReplyTargetType, targetId: string, rootIds: string[]) {
    if (rootIds.length === 0) {
      return [];
    }

    const nonRoots = await this.rows.findAll({
      orderBy: { createdAt: QueryOrder.ASC },
      populate: [...REPLY_POPULATE],
      where: {
        ...onTarget(targetType, { id: targetId }),
        hiddenAt: null,
        replyTo: { $ne: null },
      },
    });

    const collected = new Map<string, Reply>();
    let frontier = new Set(rootIds);

    while (frontier.size > 0) {
      const nextFrontier = new Set<string>();

      for (const reply of nonRoots) {
        const parentId = reply.replyTo?.id;

        if (
          parentId !== undefined &&
          parentId !== "" &&
          frontier.has(parentId) &&
          !collected.has(reply.id)
        ) {
          collected.set(reply.id, reply);
          nextFrontier.add(reply.id);
        }
      }

      frontier = nextFrontier;
    }

    return [...collected.values()];
  }

  async findChildren(replyId: string) {
    return await this.rows.findAll({
      populate: [...REPLY_POPULATE],
      where: { replyTo: { id: replyId } },
    });
  }

  async findRecentForModeration(limit: number) {
    const rows = moderationRows.parse(
      await this.em.getConnection().execute(
        `
        SELECT
          r.id,
          COUNT(rr.id) AS report_count
        FROM reply r
        LEFT JOIN reply_report rr ON r.id = rr.reply_id
        GROUP BY r.id
        ORDER BY COUNT(rr.id) DESC, r.created_at DESC
        LIMIT ?
      `,
        [limit],
      ),
    );

    const ids = rows.map((row) => row.id);

    if (ids.length === 0) {
      return [];
    }

    const replies: Reply[] = await this.rows.findAll({
      populate: [...REPLY_POPULATE],
      where: { id: { $in: ids } },
    });

    const replyById = new Map(replies.map((reply) => [reply.id, reply]));
    const countById = new Map(rows.map((row) => [row.id, row.report_count]));

    return ids
      .map((id: string) => {
        const reply = replyById.get(id);

        if (!reply) {
          return null;
        }

        return { reply, reportCount: countById.get(id) ?? 0 };
      })
      .filter((item): item is { reply: Reply; reportCount: number } => item !== null);
  }
}
