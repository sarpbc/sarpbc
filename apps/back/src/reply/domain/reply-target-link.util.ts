import { forumPostPath, forumPostSlug, matchPath } from "@sarpbc/utils";
import type { ReplyRecord as Reply, ReplyTargetType } from "./reply";

export type ReplyTargetLink = {
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
};

export function resolveReplyTargetLink(reply: Reply): ReplyTargetLink | null {
  if (reply.post) {
    return {
      targetType: "forumPost",
      targetId: reply.post.id,
      targetLabel: reply.post.title,
      targetPath: forumPostPath(reply.post.publicId, forumPostSlug(reply.post.title)),
    };
  }

  if (reply.newsArticle) {
    return {
      targetType: "newsArticle",
      targetId: reply.newsArticle.id,
      targetLabel: reply.newsArticle.title,
      targetPath: `/news/${reply.newsArticle.slug}`,
    };
  }

  if (reply.match) {
    return {
      targetType: "match",
      targetId: reply.match.id,
      targetLabel: reply.match.name,
      targetPath: matchPath(reply.match.publicId, reply.match.slug),
    };
  }

  return null;
}
