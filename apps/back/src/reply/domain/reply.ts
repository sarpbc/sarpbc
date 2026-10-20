import { InvalidInputError } from "../../common/domain/errors";
export type ReplyTargetType = "forumPost" | "newsArticle" | "match";
export type ReplyTarget = { kind: ReplyTargetType; id: string };
export interface ReplyAuthor {
  id: string;
  userName: string;
  role?: string | null;
}
export interface ReplyRecord {
  id: string;
  content: string;
  createdAt: Date;
  hiddenAt: Date | null;
  author: ReplyAuthor;
  post: { id: string; publicId: number; title: string } | null;
  newsArticle: { id: string; title: string; slug: string } | null;
  match: { id: string; publicId: number; name: string; slug: string } | null;
  replyTo: { id: string } | null;
}
export interface CreateReplyInput {
  content: string;
  postId?: string;
  newsArticleId?: string;
  matchId?: string;
  replyToId?: string;
}
export function replyTarget(
  input: Pick<CreateReplyInput, "postId" | "newsArticleId" | "matchId">,
): ReplyTarget {
  const targets: ReplyTarget[] = [];
  if (input.postId) targets.push({ kind: "forumPost", id: input.postId });
  if (input.newsArticleId) targets.push({ kind: "newsArticle", id: input.newsArticleId });
  if (input.matchId) targets.push({ kind: "match", id: input.matchId });
  if (targets.length !== 1)
    throw new InvalidInputError("Provide exactly one of postId, newsArticleId, or matchId.");
  return targets[0]!;
}
export function sameReplyTarget(child: ReplyRecord, parent: ReplyRecord): boolean {
  return Boolean(
    (child.post?.id && parent.post?.id === child.post.id) ||
    (child.newsArticle?.id && parent.newsArticle?.id === child.newsArticle.id) ||
    (child.match?.id && parent.match?.id === child.match.id),
  );
}
export interface ReplyView {
  id: string;
  content: string;
  author: { id: string; userName: string };
  createdAt: Date;
  replies: ReplyView[];
}
export interface PaginatedReplies {
  replies: ReplyView[];
  total: number;
  page: number;
  limit: number;
}
export const replySortOrder = (target: ReplyTargetType): "asc" | "desc" =>
  target === "forumPost" ? "asc" : "desc";
