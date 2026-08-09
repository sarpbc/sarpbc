import type { Reply } from "../forum/forum.entities";
import type { ReplyTargetType } from "./dto/reply-response.dto";

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
      targetPath: `/forum/post/${reply.post.id}`,
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
      targetPath: `/matches/${reply.match.id}`,
    };
  }

  return null;
}
