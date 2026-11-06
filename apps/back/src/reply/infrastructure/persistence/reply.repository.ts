import type { EntityManager } from "@mikro-orm/postgresql";
import { QueryOrder, type FilterQuery } from "@mikro-orm/core";
import type { ReplyTargetType } from "@sarpbc/types";
import type { ReplyFindOptions } from "../../application/ports";
import { REPLY_TARGETS, replySortOrder, type ReplyTargetFields } from "../../domain/reply";
import { Reply } from "./reply.entities";
import { REPLY_POPULATE } from "./reply.mapper";

function onTarget(
  targetType: ReplyTargetType,
  target: { id: string } | { $in: string[] },
): Partial<Record<keyof ReplyTargetFields, { id: string } | { $in: string[] }>> {
  return { [REPLY_TARGETS[targetType].field]: target };
}

export class ReplyRepository {
  private readonly rows;

  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository(Reply);
  }
  async findByTarget(
    targetType: ReplyTargetType,
    targetId: string,
    options: ReplyFindOptions = {},
  ): Promise<Reply[]> {
    const { includeHidden = false, limit, offset, rootsOnly = false } = options;

    const where: FilterQuery<Reply> = onTarget(targetType, { id: targetId });
    if (!includeHidden) where.hiddenAt = null;
    if (rootsOnly) where.replyTo = null;

    return this.rows.find(where, {
      populate: [...REPLY_POPULATE],
      orderBy: { createdAt: replySortOrder(targetType) },
      limit,
      offset,
    });
  }

  async findById(id: string): Promise<Reply | null> {
    return this.rows.findOne({ id }, { populate: [...REPLY_POPULATE] });
  }

  async findLatestByUser(userId: string): Promise<Reply | null> {
    return this.rows.findOne(
      { author: { id: userId } },
      { populate: [...REPLY_POPULATE], orderBy: { createdAt: QueryOrder.DESC } },
    );
  }

  async countRootsByTarget(targetType: ReplyTargetType, targetId: string): Promise<number> {
    return this.rows.count({
      ...onTarget(targetType, { id: targetId }),
      hiddenAt: null,
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

    const countsDict = await this.rows.countBy(REPLY_TARGETS[targetType].field, {
      where: { ...onTarget(targetType, { $in: targetIds }), hiddenAt: null },
    });

    const counts = new Map<string, number>();
    for (const [targetId, count] of Object.entries(countsDict)) {
      counts.set(targetId, count);
    }
    return counts;
  }

  async findDescendantsForRoots(
    targetType: ReplyTargetType,
    targetId: string,
    rootIds: string[],
  ): Promise<Reply[]> {
    if (rootIds.length === 0) {
      return [];
    }

    const nonRoots = await this.rows.find(
      {
        ...onTarget(targetType, { id: targetId }),
        hiddenAt: null,
        replyTo: { $ne: null },
      },
      { populate: [...REPLY_POPULATE], orderBy: { createdAt: QueryOrder.ASC } },
    );

    const collected = new Map<string, Reply>();
    let frontier = new Set(rootIds);

    while (frontier.size > 0) {
      const nextFrontier = new Set<string>();
      for (const reply of nonRoots) {
        const parentId = reply.replyTo?.id;
        if (parentId && frontier.has(parentId) && !collected.has(reply.id)) {
          collected.set(reply.id, reply);
          nextFrontier.add(reply.id);
        }
      }
      frontier = nextFrontier;
    }

    return [...collected.values()];
  }

  async findChildren(replyId: string): Promise<Reply[]> {
    return this.rows.find({ replyTo: { id: replyId } }, { populate: [...REPLY_POPULATE] });
  }

  async findRecentForModeration(
    limit: number,
  ): Promise<Array<{ reply: Reply; reportCount: number }>> {
    type ModerationRow = { id: string; report_count: string };

    const rows = (await this.em.getConnection().execute(`
        SELECT
          r.id,
          COUNT(rr.id) AS report_count
        FROM reply r
        LEFT JOIN reply_report rr ON r.id = rr.reply_id
        GROUP BY r.id
        ORDER BY COUNT(rr.id) DESC, r.created_at DESC
        LIMIT ${limit}
      `)) as ModerationRow[];

    const ids = rows.map((row: ModerationRow) => row.id);
    if (ids.length === 0) {
      return [];
    }

    const replies: Reply[] = await this.rows.find(
      { id: { $in: ids } },
      { populate: [...REPLY_POPULATE] },
    );

    const replyById = new Map(replies.map((reply) => [reply.id, reply]));
    const countById = new Map(rows.map((row: ModerationRow) => [row.id, Number(row.report_count)]));

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
