import { z } from "zod";
import { REPLY_REPORT_REASONS } from "@sarpbc/types";
export const ReportReplyDto = z.strictObject({
  reason: z.enum(REPLY_REPORT_REASONS),
});

export type ReportReplyDto = z.infer<typeof ReportReplyDto>;
