export type CommentTargetType = "forumPost" | "newsArticle" | "match";

export type ReplyReportReason = "spam" | "harassment" | "hate_speech" | "off_topic" | "other";

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
