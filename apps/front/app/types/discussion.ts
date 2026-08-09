export type CommentTargetType = "forumPost" | "newsArticle" | "match";

export interface CommentAuthor {
  id: string;
  userName: string;
}

export interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  createdAt: string | Date;
  replies: Comment[];
}

export interface PaginatedComments {
  replies: Comment[];
  total: number;
  page: number;
  limit: number;
}

export type CreateCommentResult =
  | { ok: true; comment: Comment }
  | {
      ok: false;
      reason: "unauthorized" | "rate_limited" | "unknown";
      message?: string;
    };
