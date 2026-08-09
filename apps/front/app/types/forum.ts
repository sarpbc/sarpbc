export interface PostPreview {
  id: string;
  title: string;
  messageCount: number;
  lastActivity: Date;
}

export interface PostShort {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
  topic?: {
    id: string;
    title: string;
  };
}

export interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  replies: Reply[];
}

export interface Post {
  id: string;
  title: string;
  content: string;
  topic: Topic;
  author: string;
  createdAt: Date;
  replies: Reply[];
}

export interface Topic {
  id: string;
  title: string;
  description: string;
}

export interface ForumPostCreationStatus {
  canCreate: boolean;
  nextAvailableAt: string | null;
  cooldownHours: number;
}

export type CreateForumPostResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unauthorized" | "rate_limited" | "conflict" | "unknown";
      message?: string;
    };

