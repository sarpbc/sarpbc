import type { ReplyAuthor } from "../domain/reply";

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
