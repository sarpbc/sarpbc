import * as z from "zod/mini";

export interface ApiErrorBody {
  message?: string | string[];
  code?: string;
  statusCode?: number;
}

const apiErrorMessageSchema = z.union([z.string(), z.array(z.string())]);

const apiErrorBodySchema = z.object({
  message: z.optional(apiErrorMessageSchema),
  code: z.optional(z.string()),
  statusCode: z.optional(z.number()),
});

const apiErrorSchema = z.object({
  statusCode: z.optional(z.number()),
  status: z.optional(z.number()),
  data: z.optional(apiErrorBodySchema),
  message: z.optional(apiErrorMessageSchema),
  code: z.optional(z.string()),
});

export function getApiErrorStatus(cause: unknown): number | undefined {
  const parsed = apiErrorSchema.safeParse(cause);
  if (!parsed.success) return undefined;

  return parsed.data.statusCode ?? parsed.data.status;
}

export function getApiErrorBody(cause: unknown): ApiErrorBody | undefined {
  const parsed = apiErrorSchema.safeParse(cause);
  if (!parsed.success) return undefined;

  if (parsed.data.data) {
    return parsed.data.data;
  }

  return {
    message: parsed.data.message,
    code: parsed.data.code,
    statusCode: parsed.data.statusCode,
  };
}

export function getApiErrorMessage(cause: unknown): string | undefined {
  const body = getApiErrorBody(cause);
  if (!body?.message) return undefined;

  if (Array.isArray(body.message)) {
    return body.message[0];
  }

  return body.message;
}

export function getApiErrorCode(cause: unknown): string | undefined {
  return getApiErrorBody(cause)?.code;
}
