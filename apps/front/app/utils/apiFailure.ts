import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from "@sarpbc/utils";

interface ApiFailure<Reason extends string> {
  ok: false;
  reason: Reason | "unauthorized" | "unknown";
  message?: string;
}

export function apiFailure<Reason extends string>(
  error: unknown,
  action: string,
  reasons: { codes?: Record<string, Reason>; statuses?: Record<number, Reason> } = {},
): ApiFailure<Reason> {
  const status = getApiErrorStatus(error);
  const code = getApiErrorCode(error);
  const message = getApiErrorMessage(error);

  if (status === 401) {
    return { ok: false, reason: "unauthorized", message };
  }

  const reason =
    (code ? reasons.codes?.[code] : undefined) ??
    (status === undefined ? undefined : reasons.statuses?.[status]);
  if (reason) {
    return { ok: false, reason, message };
  }

  console.error(`Error ${action}:`, error);
  return { ok: false, reason: "unknown", message };
}
