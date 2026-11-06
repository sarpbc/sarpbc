import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from "@sarpbc/utils";

interface ApiFailure<Reason extends string> {
  ok: false;
  reason: Reason | "unauthorized" | "unknown";
  message?: string;
}

export function apiFailure<Reason extends string>(
  cause: unknown,
  action: string,
  reasons: { codes?: Record<string, Reason>; statuses?: Record<number, Reason> } = {},
): ApiFailure<Reason> {
  const status = getApiErrorStatus(cause);
  const code = getApiErrorCode(cause);
  const message = getApiErrorMessage(cause);

  if (status === 401) {
    return { ok: false, reason: "unauthorized", message };
  }

  const reason =
    (code ? reasons.codes?.[code] : undefined) ??
    (status === undefined ? undefined : reasons.statuses?.[status]);
  if (reason) {
    return { ok: false, reason, message };
  }

  console.error(`Error ${action}:`, cause);
  return { ok: false, reason: "unknown", message };
}
