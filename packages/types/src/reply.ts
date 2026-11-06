export const REPLY_TARGET_TYPES = ["forumPost", "newsArticle", "match"] as const;

export type ReplyTargetType = (typeof REPLY_TARGET_TYPES)[number];

export interface Reply {
  id: string;
  content: string;
  author: { id: string; userName: string };
  createdAt: string;
  replies: Reply[];
}

export interface PaginatedReplies {
  replies: Reply[];
  total: number;
  page: number;
  limit: number;
}
