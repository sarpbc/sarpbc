import * as z from "zod/mini";

export interface ApiErrorBody {
  message?: string | string[];
  code?: string;
  statusCode?: number;
}

const apiErrorMessageSchema = z.union([z.string(), z.array(z.string())]);

const apiErrorBodySchema = z.object({
  code: z.optional(z.string()),
  message: z.optional(apiErrorMessageSchema),
  statusCode: z.optional(z.number()),
});

const apiErrorSchema = z.object({
  code: z.optional(z.string()),
  data: z.optional(apiErrorBodySchema),
  message: z.optional(apiErrorMessageSchema),
  status: z.optional(z.number()),
  statusCode: z.optional(z.number()),
});

export const getApiErrorStatus = (cause: unknown) => {
  const parsed = apiErrorSchema.safeParse(cause);

  return parsed.success ? (parsed.data.statusCode ?? parsed.data.status) : undefined;
};

export const getApiErrorBody = (cause: unknown) => {
  const parsed = apiErrorSchema.safeParse(cause);

  return parsed.success
    ? (parsed.data.data ?? {
        code: parsed.data.code,
        message: parsed.data.message,
        statusCode: parsed.data.statusCode,
      })
    : undefined;
};

export const getApiErrorMessage = (cause: unknown) => {
  const message = getApiErrorBody(cause)?.message;

  if (Array.isArray(message)) {
    return message[0];
  }

  return message === "" ? undefined : message;
};

export const getApiErrorCode = (cause: unknown) => getApiErrorBody(cause)?.code;
