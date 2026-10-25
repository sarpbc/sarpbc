import type { ReplyRecord } from "./models";
export { ReplyService } from "./reply.service";
export type { ReplyTargetType } from "../domain/reply";
export type { ReplyRecord, ReplyView } from "./models";
export type { ReplyDeletion } from "./ports";
export interface ReplyModerationReader {
  recentForModeration(limit: number): Promise<{ reply: ReplyRecord; reportCount: number }[]>;
}
