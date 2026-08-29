import * as z from "zod";

export interface ApiErrorBody {
  message?: string | string[];
  code?: string;
  statusCode?: number;
}

const apiErrorMessageSchema = z.union([z.string(), z.array(z.string())]);

const apiErrorBodySchema = z.object({
  message: apiErrorMessageSchema.optional(),
  code: z.string().optional(),
  statusCode: z.number().optional(),
});

const apiErrorSchema = z.object({
  statusCode: z.number().optional(),
  status: z.number().optional(),
  data: apiErrorBodySchema.optional(),
  message: apiErrorMessageSchema.optional(),
  code: z.string().optional(),
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
