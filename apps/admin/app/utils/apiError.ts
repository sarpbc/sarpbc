interface ApiErrorBody {
  message?: string | string[];
  code?: string;
  statusCode?: number;
}

function asRecord(error: unknown): Record<string, unknown> | null {
  if (typeof error !== "object" || error === null) return null;
  return error as Record<string, unknown>;
}

export function getApiErrorBody(error: unknown): ApiErrorBody | undefined {
  const record = asRecord(error);
  if (!record) return undefined;

  const data = record.data;
  if (typeof data === "object" && data !== null) {
    return data as ApiErrorBody;
  }

  return record as ApiErrorBody;
}

export function getApiErrorMessage(error: unknown): string | undefined {
  const body = getApiErrorBody(error);
  if (!body?.message) return undefined;

  if (Array.isArray(body.message)) {
    return body.message[0];
  }

  return body.message;
}
