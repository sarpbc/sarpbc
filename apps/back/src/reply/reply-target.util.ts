import { QueryOrder } from "@mikro-orm/core";
import type { ReplyTargetType } from "./dto/reply-response.dto";

export function targetFilter(
  targetType: ReplyTargetType,
  targetId: string,
  includeHidden = false,
): Record<string, unknown> {
  const hiddenFilter = includeHidden ? {} : { hiddenAt: null };
  switch (targetType) {
    case "forumPost":
      return { post: { id: targetId }, ...hiddenFilter };
    case "newsArticle":
      return { newsArticle: { id: targetId }, ...hiddenFilter };
    case "match":
      return { match: { id: targetId }, ...hiddenFilter };
    default: {
      const _exhaustive: never = targetType;
      return _exhaustive;
    }
  }
}

export function targetIdsFilter(
  targetType: ReplyTargetType,
  targetIds: string[],
): Record<string, unknown> {
  switch (targetType) {
    case "forumPost":
      return { post: { $in: targetIds } };
    case "newsArticle":
      return { newsArticle: { $in: targetIds } };
    case "match":
      return { match: { $in: targetIds } };
    default: {
      const _exhaustive: never = targetType;
      return _exhaustive;
    }
  }
}

export function targetGroupByField(targetType: ReplyTargetType): string {
  switch (targetType) {
    case "forumPost":
      return "post";
    case "newsArticle":
      return "newsArticle";
    case "match":
      return "match";
    default: {
      const _exhaustive: never = targetType;
      return _exhaustive;
    }
  }
}

export function sortOrderForTarget(targetType: ReplyTargetType): QueryOrder {
  switch (targetType) {
    case "forumPost":
      return QueryOrder.ASC;
    case "newsArticle":
    case "match":
      return QueryOrder.DESC;
    default: {
      const _exhaustive: never = targetType;
      return _exhaustive;
    }
  }
}
