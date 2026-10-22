import type { EntityManager } from "@mikro-orm/postgresql";
import type { ReplyFindOptions as FindByTargetOptions } from "../../application/ports";
import { QueryOrder, type EntityKey } from "@mikro-orm/core";
import { Reply } from "../../../forum/infrastructure/persistence/forum.entities";
import type { ReplyTargetType } from "../../domain/reply";
import {
  sortOrderForTarget,
  targetFilter,
  targetGroupByField,
  targetIdsFilter,
} from "./reply-target.util";

const POPULATE = ["author", "replyTo", "replyTo.author"] as const;

export class ReplyRepository {
  private readonly rows;

  constructor(private readonly em: EntityManager) {
    this.rows = em.getRepository(Reply);
  }
  async findByTarget(
    targetType: ReplyTargetType,
    targetId: string,
    options: FindByTargetOptions = {},
  ): Promise<Reply[]> {
    const {
      includeHidden = false,
      order = sortOrderForTarget(targetType),
      limit,
      offset,
      rootsOnly = false,
    } = options;

    const where = targetFilter(targetType, targetId, includeHidden);
    if (rootsOnly) {
      where.replyTo = null;
    }

    return this.rows.find(where, {
      populate: [...POPULATE],
      orderBy: { createdAt: order },
      limit,
      offset,
    });
  }

  async findById(id: string): Promise<Reply | null> {
    return this.rows.findOne({ id }, { populate: ["author"] });
  }

  async findLatestByUser(userId: string): Promise<Reply | null> {
    return this.rows.findOne(
      { author: { id: userId } },
      { orderBy: { createdAt: QueryOrder.DESC } },
    );
  }

  async countRootsByTarget(targetType: ReplyTargetType, targetId: string): Promise<number> {
    return this.rows.count({
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

    // Card badges: all non-hidden replies per target, including nested replies.
    const groupField = targetGroupByField(targetType);
    const countsDict = await this.rows.countBy(groupField as EntityKey<Reply>, {
      where: { ...targetIdsFilter(targetType, targetIds), hiddenAt: null },
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
        ...targetFilter(targetType, targetId),
        replyTo: { $ne: null },
      },
      { populate: [...POPULATE], orderBy: { createdAt: QueryOrder.ASC } },
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
    return this.rows.find({ replyTo: { id: replyId } });
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
      {
        populate: [
          "author",
          "post",
          "newsArticle",
          "match",
          "match.participants.team",
          "match.tournament.event",
        ],
      },
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
