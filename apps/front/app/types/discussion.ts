export type CommentTargetType = "forumPost" | "newsArticle" | "match";

export const REPLY_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "off_topic",
  "other",
] as const;

export type ReplyReportReason = (typeof REPLY_REPORT_REASONS)[number];

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

export type ReportCommentResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unauthorized" | "already_reported" | "unknown";
      message?: string;
    };
