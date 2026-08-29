import { QueryOrder } from "@mikro-orm/core";
import type { ReplyTargetType } from "./dto/reply-response.dto";

export interface ReplyTargetFilter {
  post?: { id: string };
  newsArticle?: { id: string };
  match?: { id: string };
  hiddenAt?: null;
  replyTo?: null;
}

export interface ReplyTargetIdsFilter {
  post?: { $in: string[] };
  newsArticle?: { $in: string[] };
  match?: { $in: string[] };
}

export function targetFilter(
  targetType: ReplyTargetType,
  targetId: string,
  includeHidden = false,
): ReplyTargetFilter {
  const filter: ReplyTargetFilter = {};
  switch (targetType) {
    case "forumPost":
      filter.post = { id: targetId };
      break;
    case "newsArticle":
      filter.newsArticle = { id: targetId };
      break;
    case "match":
      filter.match = { id: targetId };
      break;
    default: {
      const _exhaustive: never = targetType;
      return _exhaustive;
    }
  }
  if (!includeHidden) {
    filter.hiddenAt = null;
  }
  return filter;
}

export function targetIdsFilter(
  targetType: ReplyTargetType,
  targetIds: string[],
): ReplyTargetIdsFilter {
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
