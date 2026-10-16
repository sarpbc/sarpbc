export { ReplyService } from "./reply.service";
export type { ReplyTargetType, ReplyRecord, ReplyView } from "../domain/reply";
export type { ReplyDeletion } from "./ports";
export interface ReplyModerationReader {
  recentForModeration(
    limit: number,
  ): Promise<{ reply: import("../domain/reply").ReplyRecord; reportCount: number }[]>;
}
