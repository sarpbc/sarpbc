import type { User } from "../../../user/infrastructure/user-persistence";
import type { ReplyReportReason } from "@sarpbc/types";
import type { Reply } from "./reply.entity";

export class ReplyReport {
  id!: string;
  reply!: Reply;
  reporter!: User;
  reason!: ReplyReportReason;
  createdAt: Date = new Date();
}
