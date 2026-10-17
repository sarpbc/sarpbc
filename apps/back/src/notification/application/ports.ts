import type { ReplyRecord } from "../../reply/domain/reply";
export interface NotificationRecord {
  id: string;
  createdAt: Date;
  readAt: Date | null;
  reply: ReplyRecord;
}
export interface NotificationStore {
  findForRecipient(id: string, limit: number): Promise<NotificationRecord[]>;
  countUnread(id: string): Promise<number>;
  markRead(id: string, ids?: string[]): Promise<number>;
}
