import { EntityRepository, QueryOrder, type EntityKey } from "@mikro-orm/core";
import { Reply } from "../forum/forum.entities";
import { FindByTargetOptions, IReplyRepository } from "./domain/reply.repository.interface";
import type { ReplyTargetType } from "./dto/reply-response.dto";
import {
  sortOrderForTarget,
  targetFilter,
  targetGroupByField,
  targetIdsFilter,
} from "./reply-target.util";

const POPULATE = ["author", "replyTo", "replyTo.author"] as const;

export class ReplyRepository extends EntityRepository<Reply> implements IReplyRepository {
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

    return this.find(
      {
        ...targetFilter(targetType, targetId, includeHidden),
        ...(rootsOnly ? { replyTo: null } : {}),
      },
      {
        populate: [...POPULATE],
        orderBy: { createdAt: order },
        ...(limit !== undefined ? { limit } : {}),
        ...(offset !== undefined ? { offset } : {}),
      },
    );
  }

  async findById(id: string): Promise<Reply | null> {
    return this.findOne({ id }, { populate: ["author"] });
  }

  async findLatestByUser(userId: string): Promise<Reply | null> {
    return this.findOne({ author: { id: userId } }, { orderBy: { createdAt: QueryOrder.DESC } });
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

    // Card badges: all non-hidden replies per target, including nested replies.
    const groupField = targetGroupByField(targetType);
    const countsDict = await this.countBy(groupField as EntityKey<Reply>, {
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

    const nonRoots = await this.find(
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
