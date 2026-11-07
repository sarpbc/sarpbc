import type { Reply } from "@sarpbc/types";

export type CreateCommentResult =
  | { ok: true; comment: Reply }
  | {
      ok: false;
      reason: "unauthorized" | "rate_limited" | "unknown";
      message?: string;
    };

export type ReportCommentResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unauthorized" | "already_reported" | "unknown";
      message?: string;
    };
