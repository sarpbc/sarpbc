import type { ReplyRecord } from "../../reply/application/models";

export interface ModerationReplies {
  recentForModeration: (limit: number) => Promise<{ reply: ReplyRecord; reportCount: number }[]>;
}
