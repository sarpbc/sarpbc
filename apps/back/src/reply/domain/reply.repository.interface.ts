import { Reply } from "../../forum/forum.entities";
import type { QueryOrder } from "@mikro-orm/core";
import type { ReplyTargetType } from "../dto/reply-response.dto";

export interface FindByTargetOptions {
  includeHidden?: boolean;
  order?: QueryOrder;
  limit?: number;
  offset?: number;
  rootsOnly?: boolean;
}

export interface IReplyRepository {
  findByTarget(
    targetType: ReplyTargetType,
    targetId: string,
    options?: FindByTargetOptions,
  ): Promise<Reply[]>;
  findById(id: string): Promise<Reply | null>;
  findLatestByUser(userId: string): Promise<Reply | null>;
  countRootsByTarget(targetType: ReplyTargetType, targetId: string): Promise<number>;
  countByTargetIds(targetType: ReplyTargetType, targetIds: string[]): Promise<Map<string, number>>;
  findDescendantsForRoots(
    targetType: ReplyTargetType,
    targetId: string,
    rootIds: string[],
  ): Promise<Reply[]>;
  save(reply: Reply): Promise<void>;
  delete(reply: Reply): Promise<void>;
}
