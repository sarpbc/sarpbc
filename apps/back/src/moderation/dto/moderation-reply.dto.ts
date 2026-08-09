import type { ReplyTargetType } from "../../reply/dto/reply-response.dto";

export type ModerationReplyDto = {
  id: string;
  content: string;
  createdAt: Date;
  hiddenAt: Date | null;
  author: {
    id: string;
    userName: string;
  };
  targetType: ReplyTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  reportCount: number;
};
