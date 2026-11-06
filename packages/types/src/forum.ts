export const FORUM_ERROR_CODES = {
  POST_RATE_LIMITED: "FORUM_POST_RATE_LIMITED",
  REPLY_RATE_LIMITED: "FORUM_REPLY_RATE_LIMITED",
  REPLY_ALREADY_REPORTED: "REPLY_ALREADY_REPORTED",
} as const;

export interface ForumPost {
  id: string;
  publicId: number;
  slug: string;
  title: string;
  content: string;
  topic: { id: string; title: string };
  author: string;
  createdAt: Date | string;
}

export interface PostPreview {
  id: string;
  publicId: number;
  slug: string;
  title: string;
  messageCount: number;
  lastActivity: string;
}

export interface ForumPostListItem {
  id: string;
  publicId: number;
  slug: string;
  title: string;
  author: string;
  createdAt: string;
  commentCount: number;
  topic: { id: string; title: string };
}
