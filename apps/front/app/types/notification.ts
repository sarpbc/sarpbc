export type NotificationTargetType = "forumPost" | "newsArticle" | "match";

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
  targetType: NotificationTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
}
