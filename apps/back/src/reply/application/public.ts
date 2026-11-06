import type { ReplyRecord } from "./models";
export { ReplyService } from "./reply.service";
export type { ReplyRecord } from "./models";
export type { ReplyDeletion } from "./ports";
export interface ReplyModerationReader {
  recentForModeration(limit: number): Promise<{ reply: ReplyRecord; reportCount: number }[]>;
}
