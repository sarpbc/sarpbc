import type { ReplyRecord, ReplyTargetType, ReplyAuthor, ReplyTarget } from "../domain/reply";
import type { ReplyReportReason } from "../domain/reply-report-reason";
export interface ReplyFindOptions {
  includeHidden?: boolean;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  rootsOnly?: boolean;
}
export interface ReplyQueries {
  findRecentForModeration(limit: number): Promise<{ reply: ReplyRecord; reportCount: number }[]>;
  findByTarget(
    type: ReplyTargetType,
    id: string,
    options?: ReplyFindOptions,
  ): Promise<ReplyRecord[]>;
  findById(id: string): Promise<ReplyRecord | null>;
  findLatestByUser(id: string): Promise<ReplyRecord | null>;
  countRootsByTarget(type: ReplyTargetType, id: string): Promise<number>;
  countByTargetIds(type: ReplyTargetType, ids: string[]): Promise<Map<string, number>>;
  findDescendantsForRoots(
    type: ReplyTargetType,
    id: string,
    roots: string[],
  ): Promise<ReplyRecord[]>;
}
export interface ReplyWrites extends ReplyQueries {
  save(reply: ReplyRecord): Promise<void>;
  delete(reply: ReplyRecord): Promise<void>;
  findChildren(id: string): Promise<ReplyRecord[]>;
}
export interface ReplyReportRecord {
  id: string;
  reply: { id: string };
  reporter: { id: string };
  reason: ReplyReportReason;
  createdAt: Date;
}
export interface ReplyWriteScope {
  replies: ReplyWrites;
  reports: {
    findByReplyAndReporter(replyId: string, userId: string): Promise<ReplyReportRecord | null>;
    save(report: ReplyReportRecord): Promise<void>;
  };
  users: { findById(id: string): Promise<ReplyAuthor | null> };
  targets: {
    find(target: ReplyTarget): Promise<Pick<ReplyRecord, "post" | "newsArticle" | "match"> | null>;
  };
  notifications: { createForDirectReply(recipientId: string, replyId: string): Promise<void> };
}
export interface ReplyTransaction {
  run<T>(work: (scope: ReplyWriteScope) => Promise<T>): Promise<T>;
}
export interface ReplyDeletion {
  deleteAllForTarget(type: ReplyTargetType, id: string): Promise<void>;
}
