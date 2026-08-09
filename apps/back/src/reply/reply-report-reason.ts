export const REPLY_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "off_topic",
  "other",
] as const;

export type ReplyReportReason = (typeof REPLY_REPORT_REASONS)[number];
