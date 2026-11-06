export const REPLY_TARGET_TYPES = ["forumPost", "newsArticle", "match"] as const;

export type ReplyTargetType = (typeof REPLY_TARGET_TYPES)[number];

export const REPLY_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "off_topic",
  "other",
] as const;

export type ReplyReportReason = (typeof REPLY_REPORT_REASONS)[number];

export interface Reply {
  id: string;
  content: string;
  author: { id: string; userName: string };
  createdAt: string;
  replies: Reply[];
}

export interface AppNotification {
  id: string;
  createdAt: string;
  readAt: string | null;
  reply: {
    id: string;
    content: string;
    author: {
      userName: string;
    };
  };
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
}

export interface PaginatedReplies {
  replies: Reply[];
  total: number;
  page: number;
  limit: number;
}
