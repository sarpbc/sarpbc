import { InvalidInputError } from "../../common/domain/errors";

export type ReplyTargetType = "forumPost" | "newsArticle" | "match";
export type ReplyTarget = { kind: ReplyTargetType; id: string };

export interface ReplyAuthor {
  id: string;
  userName: string;
  role?: string | null;
}

interface ReplyTargetRefs {
  post: { id: string } | null;
  newsArticle: { id: string } | null;
  match: { id: string } | null;
}

export function replyTarget(input: {
  postId?: string;
  newsArticleId?: string;
  matchId?: string;
}): ReplyTarget {
  const targets: ReplyTarget[] = [];
  if (input.postId) targets.push({ kind: "forumPost", id: input.postId });
  if (input.newsArticleId) targets.push({ kind: "newsArticle", id: input.newsArticleId });
  if (input.matchId) targets.push({ kind: "match", id: input.matchId });
  if (targets.length !== 1)
    throw new InvalidInputError("Provide exactly one of postId, newsArticleId, or matchId.");
  return targets[0]!;
}

export function sameReplyTarget(child: ReplyTargetRefs, parent: ReplyTargetRefs): boolean {
  return Boolean(
    (child.post?.id && parent.post?.id === child.post.id) ||
    (child.newsArticle?.id && parent.newsArticle?.id === child.newsArticle.id) ||
    (child.match?.id && parent.match?.id === child.match.id),
  );
}

export const replySortOrder = (target: ReplyTargetType): "asc" | "desc" =>
  target === "forumPost" ? "asc" : "desc";
