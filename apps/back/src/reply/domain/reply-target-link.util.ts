import { forumPostPath, forumPostSlug, matchPath } from "@sarpbc/utils";
import type { ReplyTargetType } from "./reply";

export type ReplyTargetLink = {
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
};

export interface ReplyTargetSource {
  post: { id: string; publicId: number; title: string } | null;
  newsArticle: { id: string; title: string; slug: string } | null;
  match: { id: string; publicId: number; name: string; slug: string } | null;
}

export function resolveReplyTargetLink(reply: ReplyTargetSource): ReplyTargetLink | null {
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
