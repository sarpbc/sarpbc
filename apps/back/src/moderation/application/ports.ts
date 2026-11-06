import type { ReplyRecord } from "../../reply/application/public";
export interface ModerationReplies {
  recentForModeration(limit: number): Promise<{ reply: ReplyRecord; reportCount: number }[]>;
}
