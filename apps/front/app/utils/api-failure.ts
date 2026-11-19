import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorStatus,
  isNonEmptyString,
} from "@sarpbc/utils";

interface ApiFailure<Reason extends string> {
  ok: false;
  reason: Reason | "unauthorized" | "unknown";
  message?: string;
}

export const apiFailure = <Reason extends string>(
  cause: unknown,
  action: string,
  reasons: { codes?: Record<string, Reason>; statuses?: Record<number, Reason> } = {},
) => {
  const status = getApiErrorStatus(cause);
  const code = getApiErrorCode(cause);
  const message = getApiErrorMessage(cause);

  if (status === 401) {
    return { message, ok: false, reason: "unauthorized" } satisfies ApiFailure<Reason>;
  }

  const reason =
    (isNonEmptyString(code) ? reasons.codes?.[code] : undefined) ??
    (status === undefined ? undefined : reasons.statuses?.[status]);

  if (reason !== undefined) {
    return { message, ok: false, reason } satisfies ApiFailure<Reason>;
  }

  console.error(`Error ${action}:`, cause);

  return { message, ok: false, reason: "unknown" } satisfies ApiFailure<Reason>;
};
