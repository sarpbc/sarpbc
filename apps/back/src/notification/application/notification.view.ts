import type { ReplyTargetType } from "../../reply/domain/reply";

export type NotificationDto = {
  id: string;
  createdAt: Date;
  readAt: Date | null;
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
};
