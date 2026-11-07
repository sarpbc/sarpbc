import type { ReplyTargetType } from "@sarpbc/types";

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
