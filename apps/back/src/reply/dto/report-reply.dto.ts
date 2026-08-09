import { IsIn } from "class-validator";
import { REPLY_REPORT_REASONS, type ReplyReportReason } from "../reply-report-reason";

export class ReportReplyDto {
  @IsIn(REPLY_REPORT_REASONS, {
    message: "Choose a valid report reason from the list.",
  })
  readonly reason!: ReplyReportReason;
}
