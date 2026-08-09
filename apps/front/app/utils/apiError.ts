export const FORUM_ERROR_CODES = {
  POST_RATE_LIMITED: "FORUM_POST_RATE_LIMITED",
  REPLY_RATE_LIMITED: "FORUM_REPLY_RATE_LIMITED",
  REPLY_ALREADY_REPORTED: "REPLY_ALREADY_REPORTED",
} as const;

export type ForumErrorCode = (typeof FORUM_ERROR_CODES)[keyof typeof FORUM_ERROR_CODES];

export {
  getApiErrorStatus,
  getApiErrorBody,
  getApiErrorMessage,
  getApiErrorCode,
  type ApiErrorBody,
} from "@sarpbc/utils";
