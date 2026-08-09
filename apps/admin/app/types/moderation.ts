export type ModerationTargetType = "forumPost" | "newsArticle" | "match";

export interface ModerationReply {
  id: string;
  content: string;
  createdAt: string;
  hiddenAt: string | null;
  author: {
    id: string;
    userName: string;
  };
  targetType: ModerationTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  reportCount: number;
}
